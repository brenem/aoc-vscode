import * as vscode from 'vscode';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'inversify';
import { runDay } from '../helpers/run-day';

@injectable()
export class RunPartCommand implements ICommand {
    get id(): string {
        return 'aoc.runPart';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const root = this.aocProvider.root;
        const part = Number(args[0]) || NaN;

        if (part < 1 || part > 2 || isNaN(part)) {
            vscode.window.showErrorMessage('Invalid part specified.');
            return;
        }

        await runDay(root!, part as 1 | 2);
    }
}
