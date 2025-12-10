import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { StatsService, PartStats } from '../services/stats.service';
import { injectable } from 'tsyringe';
import { createRunner } from '../helpers/create-runner';
import { checkAndShowErrors } from '../helpers/check-file-errors';

@injectable()
export class RunPartCommand implements ICommand {
    private outputChannel: vscode.OutputChannel;

    get id(): string {
        return 'aoc.runPart';
    }

    constructor(
        private aocProvider: AocTreeDataProvider,
        private statsService: StatsService
    ) {
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

            // Create runner script
            // Create runner script
            const runnerPath = createRunner({
                solutionPath,
                inputPath,
                part: part as 1 | 2,
                tempDir: context.globalStorageUri.fsPath
            });

            // Clear and show output channel
            this.outputChannel.clear();
            this.outputChannel.show(true);
            
            // Execute and capture output using ts-node
            // We run from the workspace root so it picks up node_modules (including ts-node if installed locally)
            // Using npx ensures we use the local version or download if missing (though usually local is preferred)
            // Adding --experimental-specifier-resolution=node allows importing extensionless paths even in ESM mode
            // Win32 support: npx might need .cmd extension but usually node handles it
            const env = { 
                ...process.env,
                'TS_NODE_COMPILER_OPTIONS': '{"module":"commonjs","target":"ES2022"}'
            };

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running Part ${part}...`,
                cancellable: true
            }, async (progress, token) => {
                return new Promise<void>((resolve, reject) => {
                    const child = exec(`npx ts-node --experimental-specifier-resolution=node "${runnerPath}"`, { cwd: root, env }, (error, stdout, stderr) => {
                        if (error && !token.isCancellationRequested) {
                            this.outputChannel.appendLine(`Error: ${error.message}`);
                            if (stderr) {
                                this.outputChannel.appendLine(stderr);
                            }
                            resolve(); // Resolve even on error to close progress
                            return;
                        }
                        
                        if (token.isCancellationRequested) {
                             // Already handled in token listener
                             resolve();
                             return;
                        }

                        if (stdout) {
                            // Parse stats from output
                            const statsMatch = stdout.match(/__STATS__(.+)/);
                            if (statsMatch) {
                                (async () => {
                                    try {
                                        const stats: PartStats = JSON.parse(statsMatch[1]);
                                        await this.statsService.savePartStats(year, dayNum, part as 1 | 2, stats);
                                        
                                        // Refresh tree view to show updated stats
                                        this.aocProvider.refresh();
                                    } catch (e) {
                                        // Ignore parsing errors
                                    }
                                })();
                                
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
