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

        // Open the file with virtual URI
        const dayNum = dayDir.replace(/^day/, '');
        const fileName = `${year}, Day ${dayNum}: sample.txt`;
        const uri = vscode.Uri.from({
            scheme: 'aoc-solution',
            path: `/${fileName}`,
            query: `realPath=${encodeURIComponent(samplePath)}`
        });

        const doc = await vscode.workspace.openTextDocument(uri);
        vscode.window.showTextDocument(doc);
    }
}
