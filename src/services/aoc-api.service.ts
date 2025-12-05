import * as vscode from 'vscode';
import { injectable } from 'tsyringe';

@injectable()
export class AocApiService {
    private readonly BASE_URL = 'https://adventofcode.com';

    private getUserAgent(): string {
        const config = vscode.workspace.getConfiguration('aoc');
        const githubRepo = config.get<string>('githubRepo') || 'unknown/repo';
        const contactEmail = config.get<string>('contactEmail') || 'unknown@example.com';
        return `github.com/${githubRepo} by ${contactEmail}`;
    }

    async downloadInput(year: string, day: string, session: string): Promise<string> {
        const dayNum = parseInt(day.replace(/^0+/, ''));
        const url = `${this.BASE_URL}/${year}/day/${dayNum}/input`;
        
        const response = await fetch(url, {
            headers: {
                'Cookie': `session=${session}`,
                'User-Agent': this.getUserAgent()
            }
        });

        if (!response.ok) {
            if (response.status === 400) {
                throw new Error('Invalid session token. Please reconfigure.');
            }
            if (response.status === 404) {
                throw new Error('Puzzle not available yet.');
            }
            throw new Error(`Failed to download input: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    }

    async downloadProblem(year: string, day: string): Promise<string> {
        const dayNum = parseInt(day.replace(/^0+/, ''));
        const url = `${this.BASE_URL}/${year}/day/${dayNum}`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.getUserAgent()
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download problem: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    }
}
