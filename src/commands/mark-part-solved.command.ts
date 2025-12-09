import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { StatsService } from '../services/stats.service';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';

@injectable()
export class MarkPartSolvedCommand implements ICommand {
    get id(): string {
        return 'aoc.markPartSolved';
    }

    constructor(
        private statsService: StatsService,
        private aocProvider: AocTreeDataProvider
    ) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        let year: string | undefined;
        let day: string | undefined;

        // Try to get from active solution file
        const active = vscode.window.activeTextEditor;
        if (active) {
            const filePath = active.document.uri.fsPath;
            if (filePath.includes('solution.ts')) {
                // Parse year and day from file path: .../solutions/YYYY/dayXX/solution.ts
                const segments = filePath.split('/').filter(Boolean);
                const solutionsIndex = segments.lastIndexOf('solutions');
                if (solutionsIndex !== -1 && solutionsIndex + 2 < segments.length) {
                    year = segments[solutionsIndex + 1];
                    const dayDir = segments[solutionsIndex + 2];
                    day = dayDir.replace(/^day/, '').padStart(2, '0');
                }
            }
        }

        // Prompt for year if not found
        if (!year) {
            year = await vscode.window.showInputBox({
                prompt: 'Enter year',
                value: new Date().getFullYear().toString(),
                validateInput: (value) => {
                    const num = parseInt(value);
                    if (isNaN(num) || num < 2015 || num > 2100) {
                        return 'Please enter a valid year (2015-2100)';
                    }
                    return null;
                }
            });
            if (!year) return;
        }

        // Prompt for day if not found
        if (!day) {
            const dayInput = await vscode.window.showInputBox({
                prompt: 'Enter day (1-25)',
                validateInput: (value) => {
                    const num = parseInt(value);
                    if (isNaN(num) || num < 1 || num > 25) {
                        return 'Please enter a day between 1 and 25';
                    }
                    return null;
                }
            });
            if (!dayInput) return;
            day = dayInput.padStart(2, '0');
        }

        // Prompt for part
        const partSelection = await vscode.window.showQuickPick(
            [
                { label: 'Part 1', value: 1 },
                { label: 'Part 2', value: 2 },
                { label: 'Both Parts', value: 0 }
            ],
            { placeHolder: 'Which part(s) did you solve?' }
        );

        if (!partSelection) return;

        // Mark part(s) as solved
        if (partSelection.value === 0 || partSelection.value === 1) {
            this.statsService.markPartSolved(year, day, 1);
        }
        if (partSelection.value === 0 || partSelection.value === 2) {
            this.statsService.markPartSolved(year, day, 2);
        }

        // Refresh tree view
        this.aocProvider.refresh();

        // Show confirmation
        const partText = partSelection.value === 0 ? 'Both parts' : `Part ${partSelection.value}`;
        vscode.window.showInformationMessage(`✅ Marked ${partText} of Day ${parseInt(day)} (${year}) as solved!`);
    }
}
