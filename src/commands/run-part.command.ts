import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'inversify';
import { createRunner } from '../helpers/create-runner';

@injectable()
export class RunPartCommand implements ICommand {
    private outputChannel: vscode.OutputChannel;

    get id(): string {
        return 'aoc.runPart';
    }

    constructor(private aocProvider: AocTreeDataProvider) {
        this.outputChannel = vscode.window.createOutputChannel('AoC Runner');
    }

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

        try {
            // Ensure temp directory exists FIRST
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
            }

            // Create runner script
            const runnerPath = createRunner({
                solutionPath,
                inputPath,
                part: part as 1 | 2,
                tempDir: context.globalStorageUri.fsPath
            });

            // Compile TypeScript to JavaScript using TS compiler API
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

            // Clear and show output channel
            this.outputChannel.clear();
            this.outputChannel.show(true);
            
            // Execute and capture output
            exec(`node "${runnerJsPath}"`, { cwd: root }, (error, stdout, stderr) => {
                if (error) {
                    this.outputChannel.appendLine(`Error: ${error.message}`);
                    if (stderr) {
                        this.outputChannel.appendLine(stderr);
                    }
                    return;
                }
                
                if (stdout) {
                    this.outputChannel.append(stdout);
                }
                if (stderr) {
                    this.outputChannel.append(stderr);
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run part: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
