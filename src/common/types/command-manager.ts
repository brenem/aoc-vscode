import * as vscode from 'vscode';

export const ICommandManager = Symbol('ICommandManager');

export interface ICommandManager {
    registerCommands(context: vscode.ExtensionContext): void;
}
