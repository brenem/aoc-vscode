import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { StatsService, PartStats } from '../services/stats.service';
import { injectable } from 'tsyringe';
import { createRunner } from '../helpers/create-runner';
import { checkAndShowErrors } from '../helpers/check-file-errors';

@injectable()
export class RunPartWithSampleCommand implements ICommand {
    private outputChannel: vscode.OutputChannel;

    get id(): string {
        return 'aoc.runPartWithSample';
    }

    constructor(
        private aocProvider: AocTreeDataProvider,
        private statsService: StatsService
    ) {
        this.outputChannel = vscode.window.createOutputChannel('AoC Runner (Sample)');
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
        if (!active) {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Check if this is a solution file
        const filePath = active.document.uri.fsPath;
        if (!filePath.includes('solution.ts')) {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Parse year and day from file path: .../solutions/YYYY/dayXX/solution.ts
        const segments = filePath.split(path.sep);
        const solutionsIndex = segments.lastIndexOf('solutions');
        if (solutionsIndex === -1 || solutionsIndex + 3 > segments.length) {
            vscode.window.showErrorMessage('This file is not inside a solutions/YYYY/dayXX/ folder.');
            return;
        }

        const year = segments[solutionsIndex + 1];
        const dayDir = segments[solutionsIndex + 2];
        const dayNum = dayDir.replace(/^day/, '');
        const solutionPath = filePath;

        const inputPath = path.join(root, 'solutions', year, dayDir, 'input.txt');
        const samplePath = path.join(root, 'solutions', year, dayDir, 'sample.txt');

        // Check if sample.txt exists
        if (!fs.existsSync(samplePath)) {
            vscode.window.showErrorMessage('sample.txt not found. Please create it first.');
            return;
        }

        // Check if sample.txt is empty
        const sampleContent = fs.readFileSync(samplePath, 'utf8');
        if (sampleContent.trim().length === 0) {
            vscode.window.showErrorMessage('sample.txt is empty. Please add sample input before running.');
            return;
        }

        // Check for errors before running
        if (checkAndShowErrors(active.document)) {
            return;
        }

        // Save all unsaved files before running
        await vscode.workspace.saveAll();

        try {
            // Ensure temp directory exists FIRST
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
            }

            // Create runner script with sample input
            // Create runner script with sample input
            const runnerPath = createRunner({
                solutionPath,
                inputPath,
                part: part as 1 | 2,
                tempDir: context.globalStorageUri.fsPath,
                inputSource: 'sample'
            });

            // Clear and show output channel
            this.outputChannel.clear();
            this.outputChannel.show(true);
            this.outputChannel.appendLine('🧪 Running with SAMPLE input...\n');
            
            // Execute and capture output - using ts-node
            // Adding --experimental-specifier-resolution=node allows importing extensionless paths even in ESM mode
            const env = { 
                ...process.env,
                'TS_NODE_COMPILER_OPTIONS': '{"module":"commonjs","target":"ES2022"}'
            };
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running Sample Part ${part}...`,
                cancellable: true
            }, async (progress, token) => {
                return new Promise<void>((resolve, reject) => {
                    const child = exec(`npx ts-node --experimental-specifier-resolution=node "${runnerPath}"`, { cwd: root, env }, (error, stdout, stderr) => {
                        if (error && !token.isCancellationRequested) {
                            this.outputChannel.appendLine(`Error: ${error.message}`);
                            if (stderr) {
                                this.outputChannel.appendLine(stderr);
                            }
                            resolve();
                            return;
                        }

                        if (token.isCancellationRequested) {
                             resolve();
                             return;
                        }
                        
                        if (stdout) {
                            // Parse stats from output
                            const statsMatch = stdout.match(/__STATS__(.+)/);
                            if (statsMatch) {
                                // Remove stats line from display output
                                const displayOutput = stdout.replace(/__STATS__.+\n?/, '');
                                this.outputChannel.append(displayOutput);
                            } else {
                                this.outputChannel.append(stdout);
                            }
                        }
                        if (stderr) {
                            this.outputChannel.append(stderr);
                        }
                        resolve();
                    });

                    token.onCancellationRequested(() => {
                        if (child) {
                            child.kill();
                            this.outputChannel.appendLine('\n🛑 Runner stopped by user.');
                            vscode.window.showWarningMessage('Runner stopped by user.');
                        }
                        resolve();
                    });
                });
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run part: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
