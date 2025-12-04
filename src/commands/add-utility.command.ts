import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'inversify';

@injectable()
export class AddUtilityCommand implements ICommand {
    get id(): string {
        return 'aoc.addUtility';
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

        const fileName = await vscode.window.showInputBox({
            prompt: 'Utility file name (without .ts extension)',
            placeHolder: 'e.g., custom-helpers',
            validateInput: (value) => {
                if (!value) {
                    return 'Name is required';
                }
                if (!/^[a-z][a-z0-9-]*$/.test(value)) {
                    return 'Use lowercase letters, numbers, and hyphens only. Must start with a letter.';
                }
                return undefined;
            }
        });

        if (!fileName) {
            return;
        }

        const utilsDir = path.join(root, 'solutions', 'shared', 'utils');
        if (!fs.existsSync(utilsDir)) {
            fs.mkdirSync(utilsDir, { recursive: true });
        }

        const filePath = path.join(utilsDir, `${fileName}.ts`);

        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage(`File ${fileName}.ts already exists`);
            return;
        }

        const template = `/**
 * ${fileName} utilities
 */

// Add your utility functions here

`;

        fs.writeFileSync(filePath, template, 'utf-8');
        this.aocProvider.refresh();

        const doc = await vscode.workspace.openTextDocument(filePath);
        vscode.window.showTextDocument(doc);
    }
}
