import * as vscode from 'vscode';
import { initialize } from './extension-init';
import { ICommandManager } from './common/types';

export function activate(context: vscode.ExtensionContext) {

    const serviceProvider = initialize(context);
    const commandManager = serviceProvider.get<ICommandManager>(ICommandManager);

    commandManager.registerCommands(context);
}

export function deactivate() {}
