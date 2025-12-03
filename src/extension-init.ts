import 'reflect-metadata';

import * as vscode from 'vscode';
import { Container } from 'inversify';
import { ServiceManager } from './common/service-manager';
import { ServiceContainer } from './common/service-container';
import { ICommandManager, IServiceContainer, IServiceManager, ICommand } from './common/types';
import { CommandManager } from './common/command-manager';
import { AocTreeDataProvider } from './providers/aoc-tree-data-provider';
import { GenerateDayCommand } from './commands/generate-day.command';
import { OpenDayCommand } from './commands/open-day.command';
import { RunDayCommand } from './commands/run-day.command';
import { RefreshCommand } from './commands/refresh.command';
import { SolutionFileSystemProvider } from './providers/solution-file-system-provider';

export function initialize(context: vscode.ExtensionContext): IServiceContainer {
    const container = new Container();
    return buildServiceContainer(context, new ServiceManager(container), new ServiceContainer(container));
}

function buildServiceContainer(context: vscode.ExtensionContext, serviceManager: IServiceManager, serviceContainer: IServiceContainer): IServiceContainer {
    serviceManager.addSingletonInstance<IServiceContainer>(IServiceContainer, serviceContainer);
    serviceManager.addSingletonInstance<IServiceManager>(IServiceManager, serviceManager);
    serviceManager.addSingleton<ICommandManager>(ICommandManager, CommandManager);

    serviceManager.addSingleton<ICommand>(ICommand, GenerateDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, OpenDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RunDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RefreshCommand);

    const solutionProvider = new SolutionFileSystemProvider();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('aoc-solution', solutionProvider, { isCaseSensitive: true }));

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
