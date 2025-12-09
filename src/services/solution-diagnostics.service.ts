import * as vscode from 'vscode';
import * as ts from 'typescript';
import { injectable, singleton } from 'tsyringe';

@injectable()
@singleton()
export class SolutionDiagnosticsService {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private debounceTimeout: NodeJS.Timeout | undefined;
    private readonly DEBOUNCE_DELAY = 1000; // 1 second

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('aoc');
    }

    public initialize(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e))
        );

        // Also check active editor on startup/switch
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.triggerCheck(editor.document);
                }
            })
        );
    }

    private onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        this.triggerCheck(event.document);
    }

    private triggerCheck(document: vscode.TextDocument) {
        // Check if this is a solution file
        const filePath = document.uri.fsPath;
        if (!filePath || !filePath.includes('solution.ts')) {
            return;
        }

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(() => {
            // Pass the current content of the document (unsaved changes)
            this.checkSolution(document.uri, filePath, document.getText());
        }, this.DEBOUNCE_DELAY);
    }

    public checkSolution(uri: vscode.Uri, realPath: string, content?: string): boolean {
        const compilerOptions: ts.CompilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
            skipLibCheck: true,
            noEmit: true
        };

        // Create a host that reads from the provided content if available
        const host = ts.createCompilerHost(compilerOptions);
        const originalReadFile = host.readFile;
        const originalGetSourceFile = host.getSourceFile;

        // Normalize paths for comparison
        const normalizedRealPath = realPath.replace(/\\/g, '/');

        if (content !== undefined) {
             host.readFile = (fileName: string) => {
                const normalizedFileName = fileName.replace(/\\/g, '/');
                if (normalizedFileName === normalizedRealPath) {
                    return content;
                }
                return originalReadFile(fileName);
            };

            host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
                const normalizedFileName = fileName.replace(/\\/g, '/');
                if (normalizedFileName === normalizedRealPath) {
                    return ts.createSourceFile(fileName, content, languageVersion);
                }
                return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
            };
        }

        const program = ts.createProgram([realPath], compilerOptions, host);
        const diagnostics = ts.getPreEmitDiagnostics(program);

        const vscodeDiagnostics: vscode.Diagnostic[] = [];

        for (const diagnostic of diagnostics) {
            if (diagnostic.file && diagnostic.start !== undefined) {
                // Determine if this diagnostic is for the file we are checking
                // We use path normalization to be safe
                const diagnosticFile = diagnostic.file.fileName.replace(/\\/g, '/');
                
                if (diagnosticFile === normalizedRealPath) {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    
                    const range = new vscode.Range(line, character, line, character + (diagnostic.length || 0));
                    
                    let severity = vscode.DiagnosticSeverity.Error;
                    switch (diagnostic.category) {
                        case ts.DiagnosticCategory.Warning:
                            severity = vscode.DiagnosticSeverity.Warning;
                            break;
                        case ts.DiagnosticCategory.Message:
                            severity = vscode.DiagnosticSeverity.Information;
                            break;
                        case ts.DiagnosticCategory.Suggestion:
                            severity = vscode.DiagnosticSeverity.Hint;
                            break;
                    }

                    const vscodeDiagnostic = new vscode.Diagnostic(range, message, severity);
                    vscodeDiagnostics.push(vscodeDiagnostic);
                }
            }
        }

        this.diagnosticCollection.set(uri, vscodeDiagnostics);
        return vscodeDiagnostics.length === 0;
    }
    
    public clear() {
        this.diagnosticCollection.clear();
    }
}
