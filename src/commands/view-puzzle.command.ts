import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { PuzzleService } from '../services/puzzle.service';
import { TreeViewService } from '../services/tree-view.service';
import { AocTreeItem } from '../providers/aoc-tree-data-provider';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';

@injectable()
export class ViewPuzzleCommand implements ICommand {
    get id(): string {
        return 'aoc.viewPuzzle';
    }

    constructor(
        private puzzleService: PuzzleService,
        private treeViewService: TreeViewService,
        private aocProvider: AocTreeDataProvider
    ) {}

    async execute(context: vscode.ExtensionContext, year: string, day: string, treeItem?: AocTreeItem): Promise<void> {
        // If tree item is provided, expand it
        if (treeItem) {
            await this.treeViewService.reveal(treeItem, { expand: true });
        }

        // Check for existing panel
        const existingPanel = this.puzzleService.getPanel(year, day);
        if (existingPanel) {
            existingPanel.reveal();
            // Also ensure solution file is visible
            await this.openSolutionFile(year, day);
            return;
        }

        const result = await this.puzzleService.getPuzzle(year, day);
        
        if (!result) {
            return;
        }

        const { content: puzzle, fromCache } = result;

        // Open the solution file FIRST so the webview has a reference column
        await this.openSolutionFile(year, day);

        // Create WebView panel beside the solution (now in column 1)
        const panel = vscode.window.createWebviewPanel(
            'aocPuzzle',
            `Day ${parseInt(day)}: ${puzzle.title}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true
            }
        );

        // Register the panel
        this.puzzleService.registerPanel(year, day, panel);

        // Set up message handler for state persistence
        const state = { year, day };
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'getState') {
                    panel.webview.postMessage({ command: 'setState', state });
                }
            }
        );

        // Set HTML content using service
        panel.webview.html = this.puzzleService.getWebviewContent(puzzle, year, day, state);

        // Auto-refresh if cached content might be stale (missing part 2)
        if (fromCache && !puzzle.part2) {
             // We trigger refresh in background
             this.puzzleService.refreshPuzzle(year, day);
        }
    }

    private async openSolutionFile(year: string, day: string): Promise<void> {
        const root = this.aocProvider.root;
        if (!root) {
            return;
        }

        const dayDir = `day${day.padStart(2, '0')}`;
        const solutionPath = path.join(root, 'solutions', year, dayDir, 'solution.ts');
        
        if (!fs.existsSync(solutionPath)) {
            return; // Silently fail if solution doesn't exist
        }

        const uri = vscode.Uri.file(solutionPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
    }

}
