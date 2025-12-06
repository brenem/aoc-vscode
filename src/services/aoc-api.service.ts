import * as vscode from 'vscode';
import { injectable } from 'tsyringe';

export interface SubmissionResult {
    status: 'CORRECT' | 'INCORRECT' | 'WAIT' | 'ALREADY_SOLVED' | 'UNKNOWN';
    waitTime?: number; // seconds
    message: string;
}

@injectable()
export class AocApiService {
    private readonly BASE_URL = 'https://adventofcode.com';

    private getUserAgent(): string {
        const config = vscode.workspace.getConfiguration('aoc');
        const githubRepo = config.get<string>('githubRepo') || 'unknown/repo';
        const contactEmail = config.get<string>('contactEmail') || 'unknown@example.com';
        return `github.com/${githubRepo} by ${contactEmail}`;
    }

    async submitSolution(year: string, day: string, part: '1' | '2', answer: string, session: string): Promise<SubmissionResult> {
        const dayNum = parseInt(day.replace(/^0+/, ''));
        const url = `${this.BASE_URL}/${year}/day/${dayNum}/answer`;
        
        const body = new URLSearchParams({
            level: part,
            answer: answer
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Cookie': `session=${session}`,
                'User-Agent': this.getUserAgent(),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        if (!response.ok) {
            throw new Error(`Failed to submit solution: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        return this.parseSubmissionResponse(html);
    }

    private parseSubmissionResponse(html: string): SubmissionResult {
        if (html.includes("That's the right answer")) {
            return { status: 'CORRECT', message: "That's the right answer!" };
        }
        
        if (html.includes("That's not the right answer")) {
            const message = "That's not the right answer.";
            
            // Check for wait time
            // Example: "Please wait 5 minutes before trying again." or "Please wait one minute before trying again."
            let waitTime = 60; // Default 1 minute if generic wait message
            
            const waitMatch = html.match(/Please wait (\d+|one|two|three|four|five|six|seven|eight|nine|ten) (minute|second)s?/);
            if (waitMatch) {
                const amountStr = waitMatch[1];
                const unit = waitMatch[2];
                
                let amount = 1;
                if (amountStr === 'one') amount = 1;
                else if (amountStr === 'two') amount = 2;
                else if (amountStr === 'three') amount = 3;
                else if (amountStr === 'five') amount = 5;
                else if (amountStr === 'ten') amount = 10;
                else amount = parseInt(amountStr) || 1;
                
                waitTime = unit === 'minute' ? amount * 60 : amount;
            }

             return { status: 'INCORRECT', message, waitTime };
        }

        if (html.includes("You gave an answer too recently")) {
             // You gave an answer too recently; you have to wait after submitting an answer before trying again.  You have 3m 25s left to wait. <
             const leftMatch = html.match(/You have (?:(\d+)m )?(\d+)s left to wait/);
             let waitTime = 60;
             if (leftMatch) {
                 const min = parseInt(leftMatch[1] || '0');
                 const sec = parseInt(leftMatch[2]);
                 waitTime = (min * 60) + sec;
             }
             return { status: 'WAIT', message: "You did not wait long enough.", waitTime };
        }

        if (html.includes("You don't seem to be solving the right level")) {
            return { status: 'ALREADY_SOLVED', message: "You don't seem to be solving the right level. Did you already solve this?" };
        }

        return { status: 'UNKNOWN', message: "Unknown response from server." };
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
