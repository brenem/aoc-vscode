import * as vscode from 'vscode';
import * as fs from 'fs';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class OpenSampleCommand implements ICommand {
    get id(): string {
        return 'aoc.openSample';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const year = args[0] as string;
        const dayDir = args[1] as string;
        const samplePath = args[2] as string;

        if (!year || !dayDir || !samplePath) {
            vscode.window.showErrorMessage('Invalid arguments for opening sample file.');
            return;
        }

        // Open the real file directly
        const uri = vscode.Uri.file(samplePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }
}
