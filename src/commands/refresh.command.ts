import * as vscode from 'vscode';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'inversify';

@injectable()
export class RefreshCommand implements ICommand {
    get id(): string {
        return 'aoc.refresh';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public execute(context: vscode.ExtensionContext, ...args: any[]): void {
        this.aocProvider.refresh();
    }
}
