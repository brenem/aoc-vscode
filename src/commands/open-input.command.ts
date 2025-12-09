import * as vscode from 'vscode';
import * as fs from 'fs';
import { ICommand } from '../common/types';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class OpenInputCommand implements ICommand {
    get id(): string {
        return 'aoc.openInput';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const year = args[0] as string;
        const dayDir = args[1] as string;
        const inputPath = args[2] as string;

        if (!year || !dayDir || !inputPath) {
            vscode.window.showErrorMessage('Invalid arguments for opening input file.');
            return;
        }

        // Check if file is empty and trigger download if needed
        if (fs.existsSync(inputPath)) {
            const content = fs.readFileSync(inputPath, 'utf-8');
            if (content.trim().length === 0) {
                // File is empty, trigger download
                const dayNum = dayDir.replace(/^day/, '').padStart(2, '0');
                
                // Create a tree item to pass to the download command
                const treeItem = new AocTreeItem(
                    `Day ${dayNum}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'day',
                    year,
                    dayDir
                );
                
                // Trigger the download command
                await vscode.commands.executeCommand('aoc.downloadInput', treeItem);
            }
        }

        // Open the real file directly
        const uri = vscode.Uri.file(inputPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }
}
