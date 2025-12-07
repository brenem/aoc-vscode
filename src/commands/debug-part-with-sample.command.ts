import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';
import { createRunner } from '../helpers/create-runner';

@injectable()
export class DebugPartWithSampleCommand implements ICommand {
    get id(): string {
        return 'aoc.debugPartWithSample';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const root = this.aocProvider.root;
        const part = Number(args[0]) || NaN;

        if (part < 1 || part > 2 || isNaN(part)) {
            vscode.window.showErrorMessage('Invalid part specified.');
            return;
        }

        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        const active = vscode.window.activeTextEditor;
        if (!active || active.document.uri.scheme !== 'aoc-solution') {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Parse year and day from virtual URI
        const match = active.document.uri.path.match(/^\/(\d{4}),\s*Day\s*(\d{2}):/);
        if (!match) {
            vscode.window.showErrorMessage('Could not parse year and day from file.');
            return;
        }

        const year = match[1];
        const dayNum = match[2];
        const dayDir = `day${dayNum}`;

        // Get real solution path from query parameter
        const query = new URLSearchParams(active.document.uri.query);
        const solutionPath = query.get('realPath');
        if (!solutionPath) {
            vscode.window.showErrorMessage('Could not find solution file path.');
            return;
        }

        const inputPath = path.join(root, 'solutions', year, dayDir, 'input.txt');
        const samplePath = path.join(root, 'solutions', year, dayDir, 'sample.txt');

        // Check if sample.txt exists
        if (!fs.existsSync(samplePath)) {
            vscode.window.showErrorMessage('sample.txt not found. Please create it first.');
            return;
        }

        try {
            // Ensure temp directory exists FIRST
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
            }

            // First, compile the solution.ts to .js with source maps
            const solutionDir = path.dirname(solutionPath);
            const solutionFileName = path.basename(solutionPath, '.ts');
            const compiledSolutionPath = path.join(solutionDir, `${solutionFileName}.js`);
            const sourceMapPath = path.join(solutionDir, `${solutionFileName}.js.map`);

            const solutionCode = fs.readFileSync(solutionPath, 'utf-8');
            const solutionResult = ts.transpileModule(solutionCode, {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2020,
                    esModuleInterop: true,
                    skipLibCheck: true,
                    sourceMap: true
                },
                fileName: solutionPath
            });

            // Write compiled solution and source map
            fs.writeFileSync(compiledSolutionPath, solutionResult.outputText, 'utf-8');
            if (solutionResult.sourceMapText) {
                fs.writeFileSync(sourceMapPath, solutionResult.sourceMapText, 'utf-8');
            }

            // Create runner script that imports from the compiled .js file
            const runnerPath = createRunner({
                solutionPath: compiledSolutionPath, // Use compiled .js instead of .ts
                inputPath,
                part: part as 1 | 2,
                tempDir: context.globalStorageUri.fsPath,
                inputSource: 'sample'
            });

            // Compile runner TypeScript to JavaScript
            const runnerCode = fs.readFileSync(runnerPath, 'utf-8');
            const result = ts.transpileModule(runnerCode, {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2020,
                    esModuleInterop: true,
                    skipLibCheck: true
                }
            });

            // Write compiled JavaScript
            const runnerJsPath = runnerPath.replace('.ts', '.js');
            fs.writeFileSync(runnerJsPath, result.outputText, 'utf-8');

            // Synchronize breakpoints from virtual file to real file
            // Get all breakpoints set on the virtual file
            const virtualUri = active.document.uri;
            const realUri = vscode.Uri.file(solutionPath);
            
            const virtualBreakpoints = vscode.debug.breakpoints.filter(
                bp => bp instanceof vscode.SourceBreakpoint && bp.location.uri.toString() === virtualUri.toString()
            ) as vscode.SourceBreakpoint[];

            // Remove existing breakpoints on the real file to avoid duplicates
            const realBreakpoints = vscode.debug.breakpoints.filter(
                bp => bp instanceof vscode.SourceBreakpoint && bp.location.uri.toString() === realUri.toString()
            );
            if (realBreakpoints.length > 0) {
                vscode.debug.removeBreakpoints(realBreakpoints);
            }

            // Add breakpoints to the real file at the same line numbers
            if (virtualBreakpoints.length > 0) {
                const newBreakpoints = virtualBreakpoints.map(bp => {
                    return new vscode.SourceBreakpoint(
                        new vscode.Location(realUri, bp.location.range),
                        bp.enabled,
                        bp.condition,
                        bp.hitCondition,
                        bp.logMessage
                    );
                });
                vscode.debug.addBreakpoints(newBreakpoints);
                
                // Restore focus to the virtual file to prevent it from being closed
                // when VS Code opens the real file to show breakpoints
                await vscode.window.showTextDocument(active.document, {
                    viewColumn: active.viewColumn,
                    preserveFocus: false,
                    preview: false
                });
            }

            // Create debug configuration with source map path overrides
            // This maps the real file path to the virtual URI
            const debugConfig: vscode.DebugConfiguration = {
                type: 'node',
                request: 'launch',
                name: `Debug Part ${part} (Sample)`,
                program: runnerJsPath,
                cwd: root,
                console: 'integratedTerminal',
                internalConsoleOptions: 'neverOpen',
                skipFiles: ['<node_internals>/**'],
                sourceMaps: true,
                outFiles: [
                    `${solutionDir}/**/*.js`,
                    `${context.globalStorageUri.fsPath}/**/*.js`
                ],
                sourceMapPathOverrides: {
                    [solutionPath]: active.document.uri.toString()
                }
            };

            // Start debugging
            await vscode.debug.startDebugging(undefined, debugConfig);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to debug part: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
