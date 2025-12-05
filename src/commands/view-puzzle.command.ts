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
    private currentPanel?: vscode.WebviewPanel;

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

        const puzzle = await this.puzzleService.getPuzzle(year, day);
        
        if (!puzzle) {
            return;
        }

        // Open the solution file FIRST so the webview has a reference column
        await this.openSolutionFile(year, day);

        // Dispose of the previous panel if it exists
        if (this.currentPanel) {
            this.currentPanel.dispose();
        }

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

        // Track the current panel
        this.currentPanel = panel;

        // Set up message handler for state persistence
        const state = { year, day };
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'getState') {
                    panel.webview.postMessage({ command: 'setState', state });
                }
            }
        );

        // Clear reference when panel is disposed
        panel.onDidDispose(() => {
            this.currentPanel = undefined;
        });

        // Set HTML content with state persistence script
        panel.webview.html = this.getWebviewContent(puzzle, year, day, state);
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

        const dayNum = day.padStart(2, '0');
        const fileName = `${year}, Day ${dayNum}: solution`;
        const uri = vscode.Uri.from({
            scheme: 'aoc-solution',
            path: `/${fileName}.ts`,
            query: `realPath=${encodeURIComponent(solutionPath)}`
        });

        let doc = await vscode.workspace.openTextDocument(uri);
        doc = await vscode.languages.setTextDocumentLanguage(doc, 'typescript');
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preserveFocus: false });
    }

    private getWebviewContent(puzzle: { part1: string; part2?: string; title: string }, year: string, day: string, state: { year: string; day: string }): string {
        const hasPart2 = !!puzzle.part2;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Day ${parseInt(day)}: ${puzzle.title}</title>
    <style>
        body {
            font-family: 'Source Code Pro', monospace;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
        }
        
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        
        h2 {
            color: #00cc00;
            margin-top: 2em;
        }
        
        article {
            margin: 20px 0;
        }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Source Code Pro', monospace;
        }
        
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        
        pre code {
            background: none;
            padding: 0;
        }
        
        em {
            color: #ffff66;
            font-style: normal;
            font-weight: bold;
        }
        
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .star {
            color: #ffff00;
        }
        
        .tabs {
            display: flex;
            border-bottom: 2px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            background: none;
            border: none;
            color: var(--vscode-editor-foreground);
            font-size: 16px;
            opacity: 0.6;
        }
        
        .tab.active {
            opacity: 1;
            border-bottom: 3px solid var(--vscode-textLink-foreground);
            margin-bottom: -2px;
        }
        
        .tab:hover {
            opacity: 0.8;
        }
        
        .part-content {
            display: none;
        }
        
        .part-content.active {
            display: block;
        }
        
        ${!hasPart2 ? '.tabs { display: none; }' : ''}
    </style>
</head>
<body>
    <h1>🎄 Advent of Code ${year} - Day ${parseInt(day)}: ${puzzle.title}</h1>
    
    ${hasPart2 ? `
    <div class="tabs">
        <button class="tab active" onclick="showPart(1)">Part 1</button>
        <button class="tab" onclick="showPart(2)">Part 2</button>
    </div>
    ` : '<h2>--- Part One ---</h2>'}
    
    <div class="part-content active" id="part1">
        <article>${puzzle.part1}</article>
    </div>
    
    ${hasPart2 ? `
    <div class="part-content" id="part2">
        <h2>--- Part Two ---</h2>
        <article>${puzzle.part2}</article>
    </div>
    ` : ''}
    
    <script>
        const vscode = acquireVsCodeApi();
        
       // Save state for persistence
        vscode.setState(${JSON.stringify(state)});
        
        function showPart(partNum) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update content
            document.querySelectorAll('.part-content').forEach(content => content.classList.remove('active'));
            document.getElementById('part' + partNum).classList.add('active');
        }
    </script>
</body>
</html>`;
    }
}
