import "reflect-metadata";
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { initialize } from './extension-init';
import { ICommandManager } from './common/types';

export function activate(context: vscode.ExtensionContext) {
    initialize(context);
    const commandManager = container.resolve<ICommandManager>(ICommandManager);
    commandManager.registerCommands(context);
}

export function deactivate() {}
