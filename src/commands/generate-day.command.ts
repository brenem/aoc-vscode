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
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        // Check if year was passed from tree item context
        const treeItem = args[0] as AocTreeItem | undefined;
        const yearFromContext = treeItem?.year;

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
            prompt:
                new Date().getFullYear() < 2025 ? 'Day (1-25)' : 'Day (1-12)',
            validateInput: (value) => {
                const n = Number(value);
                const numDays = new Date().getFullYear() < 2025 ? 25 : 12;
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
            const template = `// You can import shared utilities from '../../shared/utils'
// Example: import { parseGrid } from '../../shared/utils/grid';

// For very large numbers, use BigInt:
// const bigNum = 123456789012345678901234567890n;
// return bigNum;

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

        this.aocProvider.refresh();

        const dayNum = day.toString().padStart(2, '0');
        const fileName = `${year}, Day ${dayNum}: solution`;
        const uri = vscode.Uri.from({
            scheme: 'aoc-solution',
            path: `/${fileName}.ts`,
            query: `realPath=${encodeURIComponent(solutionPath)}`
        });

        let doc = await vscode.workspace.openTextDocument(uri);
        doc = await vscode.languages.setTextDocumentLanguage(doc, 'typescript');
        vscode.window.showTextDocument(doc);
    }
}
