import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { SubmissionService } from '../services/submission.service';
import { AocSessionService } from '../services/aoc-session.service';
import { StatsService } from '../services/stats.service';
import { PuzzleService } from '../services/puzzle.service';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';

@injectable()
export class SubmitSolutionCommand implements ICommand {
    get id(): string {
        return 'aoc.submitSolution';
    }

    constructor(
        private submissionService: SubmissionService,
        private statsService: StatsService,
        private sessionService: AocSessionService,
        private puzzleService: PuzzleService,
        private aocProvider: AocTreeDataProvider
    ) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        // Check for session first
        if (!await this.sessionService.hasSession()) {
             const result = await vscode.window.showErrorMessage(
                 'No session token found. You need to configure it before submitting.',
                 'Configure Now'
             );
             if (result === 'Configure Now') {
                 await vscode.commands.executeCommand('aoc.configureSession');
                 // If they configured it, we could try to continue, but it's cleaner to ask them to run submit again
                 // or we could recursively call execute? a bit risky if they cancel configure.
             }
             return;
        }

        // Safety check first
        if (!this.submissionService.canSubmit()) {
            const remaining = this.submissionService.getWaitTimeRemaining();
            vscode.window.showErrorMessage(`Please wait ${remaining} seconds before submitting again.`);
            return;
        }

        const active = vscode.window.activeTextEditor;
        if (!active || active.document.uri.scheme !== 'aoc-solution') {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        const match = active.document.uri.path.match(/^\/(\d{4}),\s*Day\s*(\d{2}):/);
        if (!match) {
            vscode.window.showErrorMessage('Could not determine Day/Year from file.');
            return;
        }

        const year = match[1];
        const day = match[2];

        // Ask for part
        const partStr = await vscode.window.showQuickPick(['Part 1', 'Part 2'], {
            placeHolder: 'Select part to submit'
        });

        if (!partStr) return;

        const part = partStr.includes('1') ? 1 : 2;
        
        // Try to get the last result from stats as a default suggestion
        const lastStats = this.statsService.getPartStats(year, day, part as 1 | 2);
        const suggestedAnswer = lastStats?.success ? String(lastStats.result) : undefined;

        const answer = await vscode.window.showInputBox({
            prompt: `Enter answer for Year ${year} Day ${day} Part ${part}`,
            value: suggestedAnswer,
            validateInput: (val) => {
                 if (!val || val.trim().length === 0) return 'Answer cannot be empty';
                 return null;
            }
        });

        if (!answer) return;

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Submitting solution...',
                cancellable: false
            }, async () => {
                const result = await this.submissionService.submit(year, day, part === 1 ? '1' : '2', answer.trim());
                
                switch (result.status) {
                    case 'CORRECT':
                        // Mark part as solved
                        this.statsService.markPartSolved(year, day, part);
                        vscode.window.showInformationMessage(`🎉 Correct! ${result.message}`);
                        // Refresh the puzzle view if open
                        await this.puzzleService.refreshPuzzle(year, day);
                        // Refresh tree view to show solved status
                        this.aocProvider.refresh();
                        break;
                    case 'INCORRECT':
                        vscode.window.showErrorMessage(`❌ Incorrect. ${result.message}`);
                        break;
                    case 'WAIT':
                        vscode.window.showWarningMessage(`⏳ ${result.message}`);
                        break;
                    case 'ALREADY_SOLVED':
                        vscode.window.showInformationMessage(`ℹ️ ${result.message}`);
                        break;
                    case 'UNKNOWN':
                        vscode.window.showWarningMessage(`❓ ${result.message}`);
                        break;
                }
            });
        } catch (error) {
             const message = error instanceof Error ? error.message : String(error);
             vscode.window.showErrorMessage(`Submission Error: ${message}`);
        }
    }
}
