import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable, inject } from 'tsyringe';
import { AocSessionService } from './aoc-session.service';
import { ExtensionContext } from '../common/types';

export interface PuzzleContent {
    part1: string;
    part2?: string;
    title: string;
}

@injectable()
export class PuzzleService {
    private puzzleCacheDir: string;

    constructor(
        @inject(ExtensionContext) private context: vscode.ExtensionContext,
        private sessionService: AocSessionService
    ) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const root = workspaceFolders?.[0].uri.fsPath || '';
        this.puzzleCacheDir = path.join(root, '.aoc', 'puzzles');
    }

    async getPuzzle(year: string, day: string): Promise<{ content: PuzzleContent, fromCache: boolean } | null> {
        // Check if the puzzle is available yet
        const availabilityMessage = this.checkPuzzleAvailability(year, day);
        if (availabilityMessage) {
            vscode.window.showWarningMessage(availabilityMessage);
            return null;
        }

        // Try cache first
        const cached = await this.loadFromCache(year, day);
        if (cached) {
            return { content: cached, fromCache: true };
        }

        // Fetch from website
        const session = await this.sessionService.getSession();
        if (!session) {
            vscode.window.showErrorMessage('Please configure your AoC session token first');
            return null;
        }

        try {
            const response = await fetch(`https://adventofcode.com/${year}/day/${parseInt(day)}`, {
                headers: {
                    'Cookie': `session=${session}`,
                    'User-Agent': 'github.com/yourusername/aoc-vscode via node-fetch'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch puzzle: ${response.statusText}`);
            }

            const html = await response.text();
            const puzzleContent = this.parseHtml(html);

            // Cache for future use
            await this.saveToCache(year, day, html);

            return { content: puzzleContent, fromCache: false };
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch puzzle: ${error}`);
            return null;
        }
    }

    private parseHtml(html: string): PuzzleContent {
        // Extract title
        const titleMatch = html.match(/<h2>--- Day \d+: (.+?) ---<\/h2>/);
        const title = titleMatch ? titleMatch[1] : 'Advent of Code Puzzle';

        // Extract puzzle descriptions (articles with class="day-desc")
        const articleRegex = /<article class="day-desc">(.+?)<\/article>/gs;
        const articles = [...html.matchAll(articleRegex)];

        const part1 = articles[0] ? this.resolveLinks(articles[0][1]) : '';
        const part2 = articles[1] ? this.resolveLinks(articles[1][1]) : undefined;

        return { part1, part2, title };
    }

    private resolveLinks(html: string): string {
        const baseUrl = 'https://adventofcode.com';
        
        // Resolve relative href links
        html = html.replace(/href="(\/[^"]*)"/g, (match, path) => {
            return `href="${baseUrl}${path}"`;
        });
        
        // Resolve relative src links (for images, scripts, etc.)
        html = html.replace(/src="(\/[^"]*)"/g, (match, path) => {
            return `src="${baseUrl}${path}"`;
        });
        
        return html;
    }

    private async loadFromCache(year: string, day: string): Promise<PuzzleContent | null> {
        const cacheFile = this.getCacheFilePath(year, day);
        
        if (!fs.existsSync(cacheFile)) {
            return null;
        }

        try {
            const html = fs.readFileSync(cacheFile, 'utf-8');
            return this.parseHtml(html);
        } catch {
            return null;
        }
    }

    private async saveToCache(year: string, day: string, html: string): Promise<void> {
        const cacheFile = this.getCacheFilePath(year, day);
        const dir = path.dirname(cacheFile);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(cacheFile, html, 'utf-8');
    }

    private getCacheFilePath(year: string, day: string): string {
        return path.join(this.puzzleCacheDir, year, `day${day.padStart(2, '0')}.html`);
    }

    private checkPuzzleAvailability(year: string, day: string): string | null {
        const puzzleYear = parseInt(year);
        const puzzleDay = parseInt(day);
        
        // Get current time in EST (Advent of Code timezone)
        const now = new Date();
        const estOffset = -5; // EST is UTC-5
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const estTime = new Date(utc + (3600000 * estOffset));
        
        const currentYear = estTime.getFullYear();
        const currentMonth = estTime.getMonth() + 1; // 0-indexed
        const currentDay = estTime.getDate();
        const currentHour = estTime.getHours();
        
        // Advent of Code runs December 1-25
        // Puzzles unlock at midnight EST (00:00)
        
        // Check if year is in the future
        if (puzzleYear > currentYear) {
            return `🎄 Day ${puzzleDay} of ${puzzleYear} isn't available yet! Come back in December ${puzzleYear}.`;
        }
        
        // Check if we're in the AoC season (December)
        if (puzzleYear === currentYear && currentMonth < 12) {
            return `🎄 Advent of Code ${puzzleYear} starts on December 1st! Day ${puzzleDay} will be available then.`;
        }
        
        // Check if trying to access a day that hasn't unlocked yet
        if (puzzleYear === currentYear && currentMonth === 12) {
            // If it's December but before the day unlocks
            if (puzzleDay > currentDay) {
                const daysUntil = puzzleDay - currentDay;
                return `🎄 Day ${puzzleDay} isn't available yet! It unlocks at midnight EST on December ${puzzleDay}${daysUntil === 1 ? ' (tomorrow)' : ` (in ${daysUntil} days)`}.`;
            }
            
            // If it's the same day but before midnight EST
            if (puzzleDay === currentDay && currentHour < 0) {
                return `🎄 Day ${puzzleDay} isn't available yet! It unlocks at midnight EST (in a few hours).`;
            }
        }
        
        // Puzzle is available (or was available in a past year)
        return null;
    }

    private panels: Map<string, vscode.WebviewPanel> = new Map();

    private getPanelKey(year: string, day: string): string {
        return `${year}-${day}`;
    }

    public registerPanel(year: string, day: string, panel: vscode.WebviewPanel): void {
        const key = this.getPanelKey(year, day);
        this.panels.set(key, panel);
        
        // Listen for dispose to remove from map
        panel.onDidDispose(() => {
            if (this.panels.get(key) === panel) {
                this.panels.delete(key);
            }
        });
    }

    public getPanel(year: string, day: string): vscode.WebviewPanel | undefined {
        return this.panels.get(this.getPanelKey(year, day));
    }

    public async refreshPuzzle(year: string, day: string): Promise<void> {
        // Clear cache to force fresh fetch
        await this.clearCache(year, day);
        
        // Fetch new content
        const result = await this.getPuzzle(year, day);
        
        // Update panel if it exists
        const panel = this.getPanel(year, day);
        if (panel && result?.content) {
            panel.webview.html = this.getWebviewContent(result.content, year, day, { year, day });
        }
    }

    async clearCache(year?: string, day?: string): Promise<void> {
        if (year && day) {
            const cacheFile = this.getCacheFilePath(year, day);
            if (fs.existsSync(cacheFile)) {
                fs.unlinkSync(cacheFile);
            }
        } else if (year) {
            const yearDir = path.join(this.puzzleCacheDir, year);
            if (fs.existsSync(yearDir)) {
                fs.rmSync(yearDir, { recursive: true });
            }
        } else {
            if (fs.existsSync(this.puzzleCacheDir)) {
                fs.rmSync(this.puzzleCacheDir, { recursive: true });
            }
        }
    }

    public getWebviewContent(puzzle: PuzzleContent, year: string, day: string, state: { year: string; day: string }): string {
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
