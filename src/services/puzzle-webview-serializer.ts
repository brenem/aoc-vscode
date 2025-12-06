import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { PuzzleService } from '../services/puzzle.service';

interface PuzzleWebviewState {
    year: string;
    day: string;
}

@injectable()
export class PuzzleWebviewSerializer implements vscode.WebviewPanelSerializer {
    constructor(private puzzleService: PuzzleService) {}

    async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: PuzzleWebviewState
    ): Promise<void> {
        // Restore the webview content
        if (state && state.year && state.day) {
            const result = await this.puzzleService.getPuzzle(state.year, state.day);
            
            if (result?.content) {
                const puzzle = result.content;
                webviewPanel.title = `Day ${parseInt(state.day)}: ${puzzle.title}`;
                webviewPanel.webview.html = this.puzzleService.getWebviewContent(puzzle, state.year, state.day, state);
            }
        }
    }

}
