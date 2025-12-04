import 'reflect-metadata';

import * as vscode from 'vscode';
import { Container } from 'inversify';
import { ServiceManager } from './common/service-manager';
import { ServiceContainer } from './common/service-container';
import { ICommandManager, IServiceContainer, IServiceManager, ICommand } from './common/types';
import { CommandManager } from './common/command-manager';
import { AocTreeDataProvider, AocTreeItem } from './providers/aoc-tree-data-provider';
import { GenerateDayCommand } from './commands/generate-day.command';
import { OpenDayCommand } from './commands/open-day.command';
import { RunDayCommand } from './commands/run-day.command';
import { RefreshCommand } from './commands/refresh.command';
import { AddUtilityCommand } from './commands/add-utility.command';
import { ConfigureSessionCommand } from './commands/configure-session.command';
import { DownloadInputCommand } from './commands/download-input.command';
import { RunPartCommand } from './commands/run-part.command';
import { SolutionFileSystemProvider } from './providers/solution-file-system-provider';
import { SolutionCodeLensProvider } from './providers/solution-codelens-provider';
import { AocSessionService } from './services/aoc-session.service';
import { AocApiService } from './services/aoc-api.service';

export function initialize(context: vscode.ExtensionContext): IServiceContainer {
    const container = new Container();
    return buildServiceContainer(context, new ServiceManager(container), new ServiceContainer(container));
}

function buildServiceContainer(context: vscode.ExtensionContext, serviceManager: IServiceManager, serviceContainer: IServiceContainer): IServiceContainer {
    serviceManager.addSingletonInstance<IServiceContainer>(IServiceContainer, serviceContainer);
    serviceManager.addSingletonInstance<IServiceManager>(IServiceManager, serviceManager);
    serviceManager.addSingleton<ICommandManager>(ICommandManager, CommandManager);

    // Register services (session service needs context manually)
    const sessionService = new AocSessionService(context);
    serviceManager.addSingletonInstance<AocSessionService>(AocSessionService, sessionService);
    serviceManager.addSingleton<AocApiService>(AocApiService, AocApiService);

    // Register commands
    serviceManager.addSingleton<ICommand>(ICommand, GenerateDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, OpenDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RunDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RefreshCommand);
    serviceManager.addSingleton<ICommand>(ICommand, AddUtilityCommand);
    serviceManager.addSingleton<ICommand>(ICommand, ConfigureSessionCommand);
    serviceManager.addSingleton<ICommand>(ICommand, DownloadInputCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RunPartCommand);

    const solutionProvider = new SolutionFileSystemProvider();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('aoc-solution', solutionProvider, { isCaseSensitive: true }));

    const codeLensProvider = new SolutionCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'typescript', scheme: 'aoc-solution' }, codeLensProvider));

    addTreeDataProvider(serviceManager, context);

    return serviceContainer;
}

function addTreeDataProvider(serviceManager: IServiceManager, context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		console.log('No workspace open. AoC extension is idle.');
	}

	const root = workspaceFolders?.[0].uri.fsPath || '';

	const aocProvider = new AocTreeDataProvider(root);
	const treeView = vscode.window.createTreeView('aocExplorer', {
		treeDataProvider: aocProvider
	});

	context.subscriptions.push(treeView);

	// Sync tree view selection with active editor
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.uri.scheme === 'aoc-solution') {
				// Parse year and day from the URI path
				// Format: /YYYY, Day DD: solution.ts
				const match = editor.document.uri.path.match(/^\/(\d{4}),\s*Day\s*(\d{2}):/);
				if (match) {
					const year = match[1];
					const dayNum = match[2];
					const dayDir = `day${dayNum}`;

					// Find the corresponding tree item
					const dayItem = new AocTreeItem(
						`Day ${dayNum}`,
						vscode.TreeItemCollapsibleState.None,
						'day',
						year,
						dayDir
					);

					// Reveal the item in the tree view
					treeView.reveal(dayItem, { select: true, focus: false });
				}
			}
		})
	);

    serviceManager.addSingletonInstance<AocTreeDataProvider>(AocTreeDataProvider, aocProvider);
}
