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

    async getPuzzle(year: string, day: string): Promise<PuzzleContent | null> {
        // Try cache first
        const cached = await this.loadFromCache(year, day);
        if (cached) {
            return cached;
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

            return puzzleContent;
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

        const part1 = articles[0] ? articles[0][1] : '';
        const part2 = articles[1] ? articles[1][1] : undefined;

        return { part1, part2, title };
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
}
