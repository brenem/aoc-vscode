import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { StatsService } from '../services/stats.service';

@injectable()
export class DebugStatsCommand implements ICommand {
    get id(): string {
        return 'aoc.debugStats';
    }

    constructor(private statsService: StatsService) {}

    public async execute(context: vscode.ExtensionContext): Promise<void> {
        // Get year and day input
        const year = await vscode.window.showInputBox({
            prompt: 'Enter year',
            value: '2025'
        });
        if (!year) return;

        const dayInput = await vscode.window.showInputBox({
            prompt: 'Enter day (e.g., 2)',
        });
        if (!dayInput) return;
        
        const day = dayInput.padStart(2, '0');

        // Get the stats
        const dayStats = this.statsService.getDayStats(year, day);
        
        // Format output
        const output = JSON.stringify({
            key: `${year}-${day}`,
            stats: dayStats
        }, null, 2);

        // Show in a new document
        const doc = await vscode.workspace.openTextDocument({
            content: output,
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
    }
}
