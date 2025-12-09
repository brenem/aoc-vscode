import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ICommand } from '../common/types';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class OpenDayCommand implements ICommand {
    get id(): string {
        return 'aoc.openDay';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const root = this.aocProvider.root;
        const item = args[0] as { year?: string, dayDir?: string } ?? null;

        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        let year = item?.year;
        let dayDir = item?.dayDir;

        if (!year || !dayDir) {
            year = await vscode.window.showInputBox({ prompt: 'Year (e.g. 2025)'});
            if (!year) {
                return;
            }

            const day = await vscode.window.showInputBox({ prompt: new Date().getFullYear() < 2025 ? 'Day (1-25)' : 'Day (1-12)' });
            if (!day) {
                return;
            }

            dayDir = `day${day.toString().padStart(2, '0')}`;
        }

        const solutionPath = path.join(root, 'solutions', year!, dayDir!, 'solution.ts');
        if (!fs.existsSync(solutionPath)) {
            vscode.window.showErrorMessage('solution.ts does not exist; run "AoC: Generate Day" first.');
            return;
        }

        const uri = vscode.Uri.file(solutionPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }
}
