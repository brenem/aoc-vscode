import * as vscode from 'vscode';

export const ICommand = Symbol('ICommand');

export interface ICommand {
    id: string;
    execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> | void;
}
