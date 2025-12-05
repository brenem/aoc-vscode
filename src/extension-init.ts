import 'reflect-metadata';

import * as vscode from 'vscode';
import { Container } from 'inversify';
import { ServiceManager } from './common/service-manager';
import { ServiceProvider } from './common/service-provider';
import { ICommandManager, IServiceProvider, IServiceManager, ICommand } from './common/types';
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
import { OpenInputCommand } from './commands/open-input.command';
import { DebugPartCommand } from './commands/debug-part.command';
import { SolutionFileSystemProvider } from './providers/solution-file-system-provider';
import { SolutionCodeLensProvider } from './providers/solution-codelens-provider';
import { AocSessionService } from './services/aoc-session.service';
import { AocApiService } from './services/aoc-api.service';
import { StatsService } from './services/stats.service';

export function initialize(context: vscode.ExtensionContext): IServiceProvider {
    const container = new Container();
	const serviceManager = new ServiceManager(container);
	const serviceProvider = new ServiceProvider(container);

	registerServices(context, serviceManager, serviceProvider);

	addProviders(context, serviceProvider);

	return serviceProvider;
}

function registerServices(context: vscode.ExtensionContext, serviceManager: IServiceManager, serviceProvider: IServiceProvider) {
	serviceManager.addSingletonInstance<IServiceProvider>(IServiceProvider, serviceProvider);
    serviceManager.addSingletonInstance<IServiceManager>(IServiceManager, serviceManager);
    serviceManager.addSingleton<ICommandManager>(ICommandManager, CommandManager);
    serviceManager.addSingletonFactory<AocSessionService>(AocSessionService, () => new AocSessionService(context));
    serviceManager.addSingleton<AocApiService>(AocApiService, AocApiService);
    serviceManager.addSingletonFactory<StatsService>(StatsService, () => new StatsService(context));
	serviceManager.addSingleton<SolutionFileSystemProvider>(SolutionFileSystemProvider, SolutionFileSystemProvider);
	serviceManager.addSingleton<SolutionCodeLensProvider>(SolutionCodeLensProvider, SolutionCodeLensProvider);

	// Register AocTreeDataProvider using factory pattern
	serviceManager.addSingletonFactory<AocTreeDataProvider>(AocTreeDataProvider, (container) => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			console.log('No workspace open. AoC extension is idle.');
		}

		const root = workspaceFolders?.[0].uri.fsPath || '';

		// Get StatsService from container
		const statsService = container.get<StatsService>(StatsService);

		return new AocTreeDataProvider(root, statsService);
	});

    // Register commands
    serviceManager.addSingleton<ICommand>(ICommand, GenerateDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, OpenDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RunDayCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RefreshCommand);
    serviceManager.addSingleton<ICommand>(ICommand, AddUtilityCommand);
    serviceManager.addSingleton<ICommand>(ICommand, ConfigureSessionCommand);
    serviceManager.addSingleton<ICommand>(ICommand, DownloadInputCommand);
    serviceManager.addSingleton<ICommand>(ICommand, RunPartCommand);
    serviceManager.addSingleton<ICommand>(ICommand, OpenInputCommand);
    serviceManager.addSingleton<ICommand>(ICommand, DebugPartCommand);
}

function addProviders(context: vscode.ExtensionContext, serviceProvider: IServiceProvider) {
    const solutionProvider = serviceProvider.get<SolutionFileSystemProvider>(SolutionFileSystemProvider);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('aoc-solution', solutionProvider, { isCaseSensitive: true }));

    const codeLensProvider = serviceProvider.get<SolutionCodeLensProvider>(SolutionCodeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'typescript', scheme: 'aoc-solution' }, codeLensProvider));

    addTreeDataProvider(context, serviceProvider);
}

function addTreeDataProvider(context: vscode.ExtensionContext, serviceProvider: IServiceProvider) {
	// Get the provider instance and set up tree view
	const aocProvider = serviceProvider.get<AocTreeDataProvider>(AocTreeDataProvider);
	const treeView = vscode.window.createTreeView('aocExplorer', {
		treeDataProvider: aocProvider
	});

	context.subscriptions.push(treeView);

	// Sync tree view selection with active editor
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.uri.scheme === 'aoc-solution') {
				// Parse year, day, and filename from the URI path
				// Format: /YYYY, Day DD: filename.ts
				const match = editor.document.uri.path.match(/^\/(\d{4}),\s*Day\s*(\d{2}):\s*(.+)$/);
				if (match) {
					const year = match[1];
					const dayNum = match[2];
					const fileName = match[3];
					const dayDir = `day${dayNum}`;

					// Get the real path from query parameter
					const query = new URLSearchParams(editor.document.uri.query);
					const realPath = query.get('realPath');

					// Find the corresponding tree item (the file, not the day)
					const fileItem = new AocTreeItem(
						fileName,
						vscode.TreeItemCollapsibleState.None,
						'dayFile',
						year,
						dayDir,
						realPath || undefined
					);

					// Reveal the item in the tree view
					treeView.reveal(fileItem, { select: true, focus: false });
				}
			}
		})
	);
}
