import 'reflect-metadata';

import * as vscode from 'vscode';
import { Container } from 'inversify';
import { ServiceManager } from './common/service-manager';
import { ServiceContainer } from './common/service-container';
import { ICommandManager, IServiceContainer, IServiceManager } from './common/types';
import { CommandManager } from './common/command-manager';
import { AocTreeDataProvider } from './providers/aoc-tree-data-provider';

export function initialize(context: vscode.ExtensionContext): IServiceContainer {
    const container = new Container();
    return buildServiceContainer(new ServiceManager(container), new ServiceContainer(container));
}

function buildServiceContainer(serviceManager: IServiceManager, serviceContainer: IServiceContainer): IServiceContainer {
    serviceManager.addSingletonInstance<IServiceContainer>(IServiceContainer, serviceContainer);
    serviceManager.addSingletonInstance<IServiceManager>(IServiceManager, serviceManager);
    serviceManager.addSingleton<ICommandManager>(ICommandManager, CommandManager);

    addTreeDataProvider(serviceManager);

    return serviceContainer;
}

function addTreeDataProvider(serviceManager: IServiceManager) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		console.log('No workspace open. AoC extension is idle.');
	}

	const root = workspaceFolders?.[0].uri.fsPath || '';

	const aocProvider = new AocTreeDataProvider(root);
	vscode.window.registerTreeDataProvider('aocExplorer', aocProvider);

    serviceManager.addSingletonInstance<AocTreeDataProvider>(AocTreeDataProvider, aocProvider);
}
