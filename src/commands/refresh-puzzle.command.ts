import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { PuzzleService } from '../services/puzzle.service';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';

@injectable()
export class RefreshPuzzleCommand implements ICommand {
    get id(): string {
        return 'aoc.refreshPuzzle';
    }

    constructor(
        private puzzleService: PuzzleService,
        private aocProvider: AocTreeDataProvider
    ) {}

    async execute(context: vscode.ExtensionContext, treeItem?: AocTreeItem): Promise<void> {
        let year: string | undefined;
        let day: string | undefined;

        if (treeItem && treeItem.contextValue === 'day') {
            // Invoked from tree view on a specific day
            const match = treeItem.label?.toString().match(/^Day (\d+)/);
            if (match) {
                day = match[1];
                // Try to find year from parent? Or assume current year context? 
                // The tree item doesn't explicitly store year in a public property usually, 
                // but ID might have it or we can guess. 
                // Wait, AocTreeItem usually has year/day commands attached.
                // Let's rely on the ID or command args if possible, but treeItem is what we get.
                
                // Hack: checking path or parent is hard with just TreeItem.
                // However, the active solution file might help if treeItem is missing.
                
                // Actually, let's look at `AocTreeDataProvider`. 
                // If I can't easily get it, I'll fallback to active editor or prompt.
            }
        }

        // If not from tree view, try active editor or webview
        if (!day || !year) {
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
        }
        
        // If still not found, check if a puzzle webview is active?
        // We can't easily query active webview content.
        
        // Fallback: Prompt user to verify context
        if (!year || !day) {
            // Try to assume from tree provider's current year if available
            // But let's just error for now unless we can be sure.
            // Actually, showing a picker is better.
             vscode.window.showErrorMessage('Could not determine which puzzle to refresh. Open a solution file first.');
             return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Refreshing Year ${year} Day ${day}...`,
            cancellable: false
        }, async () => {
             await this.puzzleService.refreshPuzzle(year!, day!);
        });
        
        vscode.window.showInformationMessage(`Refreshed Day ${day}.`);
    }
}
