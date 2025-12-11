import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ICommand } from '../common/types';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class GenerateDayCommand implements ICommand {
    get id(): string {
        return 'aoc.generateDay';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(
        context: vscode.ExtensionContext,
        ...args: any[]
    ): Promise<void> {
        const root = this.aocProvider.root;

        if (!root) {
            const action = await vscode.window.showErrorMessage(
                'No AOC workspace detected. Would you like to initialize this workspace as an AOC project?',
                'Initialize Project',
                'Cancel'
            );
            
            if (action === 'Initialize Project') {
                await vscode.commands.executeCommand('aoc.initProject');
            }
            return;
        }

        // Check if year was passed from tree item context
        // Only use year from context if it's actually a year tree item
        const treeItem = args[0] as AocTreeItem | undefined;
        const yearFromContext = (treeItem?.contextValue === 'year') ? treeItem.year : undefined;

        let year = yearFromContext;
        if (!year) {
            year = await vscode.window.showInputBox({
                prompt: 'Year (e.g. 2025)',
                value: new Date().getFullYear().toString()
            });

            if (!year) {
                return;
            }
        }

        const day = await vscode.window.showInputBox({
            prompt: parseInt(year!) < 2025 ? 'Day (1-25)' : 'Day (1-12)',
            validateInput: (value) => {
                const n = Number(value);
                const selectedYear = parseInt(year!);
                
                // 2025 onwards: 12 days, Earlier years: 25 days
                const numDays = selectedYear < 2025 ? 25 : 12;
                
                return n >= 1 && n <= numDays
                    ? undefined
                    : `Enter a number between 1 and ${numDays}`;
            }
        });

        if (!day) {
            return;
        }

        const dayDirName = `day${day.toString().padStart(2, '0')}`;
        const dayDir = path.join(root, 'solutions', year, dayDirName);

        fs.mkdirSync(dayDir, { recursive: true });

        // Initialize shared utilities folder on first use
        const sharedDir = path.join(root, 'solutions', 'shared', 'utils');
        if (!fs.existsSync(sharedDir)) {
            fs.mkdirSync(sharedDir, { recursive: true });

            // Copy template utilities
            const templatesDir = path.join(context.extensionPath, 'templates', 'utils');
            const utilFiles = ['grid.ts', 'math.ts', 'string.ts', 'array.ts'];

            for (const file of utilFiles) {
                const templatePath = path.join(templatesDir, file);
                const targetPath = path.join(sharedDir, file);
                if (fs.existsSync(templatePath)) {
                    fs.copyFileSync(templatePath, targetPath);
                }
            }
        }

        const solutionPath = path.join(dayDir, 'solution.ts');
        if (!fs.existsSync(solutionPath)) {
            const template = `
export async function part1(input: string): Promise<number | string | bigint> {
    return 0;
}

export async function part2(input: string): Promise<number | string | bigint> {
    return 0;
}
`;
            fs.writeFileSync(solutionPath, template, 'utf-8');
        }

        const inputPath = path.join(dayDir, 'input.txt');
        if (!fs.existsSync(inputPath)) {
            fs.writeFileSync(inputPath, '', 'utf-8');
        }

        const samplePath = path.join(dayDir, 'sample.txt');
        if (!fs.existsSync(samplePath)) {
            fs.writeFileSync(samplePath, '', 'utf-8');
        }

        vscode.window.showInformationMessage(
            `AoC day created: ${year} ${dayDirName}`
        );

        // Open solution file and puzzle webview (same as clicking the day node)
        const dayNum = day.padStart(2, '0');
        await vscode.commands.executeCommand('aoc.viewPuzzle', year, dayNum);
    }
}
