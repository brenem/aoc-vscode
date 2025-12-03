import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ICommand } from '../common/types';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'inversify';

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

        const solutionPath = path.join(dayDir, 'solution.ts');
        if (!fs.existsSync(solutionPath)) {
            const template = `export function part1(input: string): number | string {
    return 0;
}

export function part2(input: string): number | string {
    return 0;
}

// You can import shared utilities from '../shared/...' as needed.
`;
            fs.writeFileSync(solutionPath, template, 'utf-8');
        }

        const inputPath = path.join(dayDir, 'input.txt');
        if (!fs.existsSync(inputPath)) {
            fs.writeFileSync(inputPath, '', 'utf-8');
        }

        vscode.window.showInformationMessage(
            `AoC dat created: ${year} ${dayDirName}`
        );

        this.aocProvider.refresh();
        
        const dayNum = day.toString().padStart(2, '0');
        const fileName = `${year}, Day ${dayNum}`;
        const uri = vscode.Uri.from({
            scheme: 'aoc-solution',
            path: `/${fileName}`,
            query: `realPath=${encodeURIComponent(solutionPath)}`
        });

        let doc = await vscode.workspace.openTextDocument(uri);
        doc = await vscode.languages.setTextDocumentLanguage(doc, 'typescript');
        vscode.window.showTextDocument(doc);
    }
}
