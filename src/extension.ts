import "reflect-metadata";
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { initialize } from './extension-init';
import { ICommandManager } from './common/types';

export async function activate(context: vscode.ExtensionContext) {
    await initialize(context);
    const commandManager = container.resolve<ICommandManager>(ICommandManager);
    commandManager.registerCommands(context);
}

export function deactivate() {}
