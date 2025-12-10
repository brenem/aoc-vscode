import "reflect-metadata";

import * as vscode from 'vscode';
import { container } from 'tsyringe';
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
import { ViewPuzzleCommand } from './commands/view-puzzle.command';
import { RunPartWithSampleCommand } from './commands/run-part-with-sample.command';
import { DebugPartWithSampleCommand } from './commands/debug-part-with-sample.command';
import { OpenSampleCommand } from './commands/open-sample.command';
import { UpgradeDayCommand } from './commands/upgrade-day.command';
import { SolutionCodeLensProvider } from './providers/solution-codelens-provider';
import { TreeViewService } from './services/tree-view.service';
import { PuzzleWebviewSerializer } from './services/puzzle-webview-serializer';
import { SolutionDiagnosticsService } from './services/solution-diagnostics.service';
import { ExtensionContext, ICommand, ICommandManager } from './common/types';
import { CommandManager } from './common/command-manager';
import { CheckSolutionCommand } from './commands/check-solution.command';
import { SubmitSolutionCommand } from './commands/submit-solution.command';
import { RefreshPuzzleCommand } from './commands/refresh-puzzle.command';
import { MarkPartSolvedCommand } from './commands/mark-part-solved.command';
import { DebugStatsCommand } from './commands/debug-stats.command';
import { AocWorkspaceService } from './services/aoc-workspace.service';
import { InitProjectCommand } from './commands/init-project.command';
import { GenerateTsconfigCommand } from './commands/generate-tsconfig.command';
import { AOC_CONFIG_FILENAME } from './common/aoc-config.interface';

export async function initialize(context: vscode.ExtensionContext): Promise<void> {
	registerServices(context);
	
	// Detect AOC workspaces
	const workspaceService = container.resolve(AocWorkspaceService);
	const aocWorkspaces = await workspaceService.findAocWorkspaces();
	
	if (aocWorkspaces.length > 0) {
		// Set context to show tree view
		await vscode.commands.executeCommand('setContext', 'aocWorkspaceDetected', true);
		
		// Initialize providers and features
		await addProviders(context);
	} else {
		// No AOC workspaces detected
		await vscode.commands.executeCommand('setContext', 'aocWorkspaceDetected', false);
		console.log('No AOC workspaces detected. Run "AoC: Initialize Project" to create one.');
	}
	
	// Watch for .aoc.json file changes to dynamically activate/deactivate
	setupWorkspaceWatcher(context, workspaceService);
}

function registerServices(context: vscode.ExtensionContext) {
	// Register context as a value for injection
	container.register(ExtensionContext, { useValue: context });

	// Register infrastructure
	container.registerSingleton(ICommandManager, CommandManager);
	container.registerSingleton(AocWorkspaceService);
	
	// Register commands
	container.register<ICommand>(ICommand, { useClass: InitProjectCommand });
	container.register<ICommand>(ICommand, { useClass: GenerateTsconfigCommand });
	container.register<ICommand>(ICommand, { useClass: AddUtilityCommand });
	container.register<ICommand>(ICommand, { useClass: GenerateDayCommand });
	container.register<ICommand>(ICommand, { useClass: OpenDayCommand });
	container.register<ICommand>(ICommand, { useClass: RunDayCommand });
	container.register<ICommand>(ICommand, { useClass: RefreshCommand });
	container.register<ICommand>(ICommand, { useClass: ConfigureSessionCommand });
	container.register<ICommand>(ICommand, { useClass: DownloadInputCommand });
	container.register<ICommand>(ICommand, { useClass: RunPartCommand });
	container.register<ICommand>(ICommand, { useClass: OpenInputCommand });
	container.register<ICommand>(ICommand, { useClass: DebugPartCommand });
	container.register<ICommand>(ICommand, { useClass: ViewPuzzleCommand });
	container.register<ICommand>(ICommand, { useClass: RunPartWithSampleCommand });
	container.register<ICommand>(ICommand, { useClass: DebugPartWithSampleCommand });
	container.register<ICommand>(ICommand, { useClass: OpenSampleCommand });
	container.register<ICommand>(ICommand, { useClass: UpgradeDayCommand });
	container.register<ICommand>(ICommand, { useClass: CheckSolutionCommand });
	container.register<ICommand>(ICommand, { useClass: SubmitSolutionCommand });
	container.register<ICommand>(ICommand, { useClass: RefreshPuzzleCommand });
	container.register<ICommand>(ICommand, { useClass: MarkPartSolvedCommand });
	container.register<ICommand>(ICommand, { useClass: DebugStatsCommand });
}

async function addProviders(context: vscode.ExtensionContext) {
	// Initialize breakpoint sync service
	
	const codeLensProvider = container.resolve(SolutionCodeLensProvider);
	context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'typescript', scheme: 'file' }, codeLensProvider));
	
	const diagnosticsService = container.resolve(SolutionDiagnosticsService);
	diagnosticsService.initialize(context);

	// Register puzzle webview serializer
	const puzzleSerializer = container.resolve(PuzzleWebviewSerializer);
	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer('aocPuzzle', puzzleSerializer)
	);

	await addTreeDataProvider(context);
}

async function addTreeDataProvider(context: vscode.ExtensionContext) {
	// Get the provider instance
	const aocProvider = container.resolve(AocTreeDataProvider);
	
	// Initialize the provider BEFORE registering
	// This ensures getChildren() won't be called before we're ready
	await aocProvider.initialize();
	
	// Set context to make the view visible
	await vscode.commands.executeCommand('setContext', 'aocInitialized', true);
	
	// Now register the tree data provider - this creates the view
	const treeView = vscode.window.createTreeView('aocExplorer', {
		treeDataProvider: aocProvider,
		showCollapseAll: true
	});

	// Register tree view with service for programmatic access
	const treeViewService = container.resolve(TreeViewService);
	treeViewService.setTreeView(treeView);

	context.subscriptions.push(treeView);

	// Sync tree view selection with active editor
	const syncTreeViewSelection = () => {
		// Only reveal if the tree view is visible to avoid stealing focus/expanding unnecessarily
		if (!treeView.visible) {
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const filePath = editor.document.uri.fsPath;

		// Match .../solutions/YYYY/dayXX/(solution.ts|input.txt|sample.txt)
		const dayMatch = filePath.match(/solutions[\\\/](\d{4})[\\\/](day\d{2})[\\\/](solution\.ts|input\.txt|sample\.txt)$/);

		if (dayMatch) {
			const [_, year, dayDir, fileName] = dayMatch;

			// Find the corresponding tree item
			const fileItem = new AocTreeItem(
				fileName,
				vscode.TreeItemCollapsibleState.None,
				'dayFile',
				year,
				dayDir,
				filePath
			);

			// Reveal: select but do not take focus from editor
			treeView.reveal(fileItem, { select: true, focus: false });
			return;
		}

		// Match .../solutions/shared/utils/xxx.ts
		const utilsMatch = filePath.match(/solutions[\\\/]shared[\\\/]utils[\\\/]([^\\\/]+\.ts)$/);
		if (utilsMatch) {
			const [_, fileName] = utilsMatch;

			const fileItem = new AocTreeItem(
				fileName,
				vscode.TreeItemCollapsibleState.None,
				'utilityFile',
				undefined,
				undefined,
				filePath
			);

			treeView.reveal(fileItem, { select: true, focus: false });
		}
	};

	// 1. Sync on active text editor change
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(syncTreeViewSelection)
	);

	// 2. Sync when the tree view itself becomes visible
	context.subscriptions.push(
		treeView.onDidChangeVisibility(e => {
			if (e.visible) {
				syncTreeViewSelection();
			}
		})
	);

	// 3. Sync immediately on startup if we have an active editor
	// Use a small timeout to let the tree view initialize fully
	setTimeout(syncTreeViewSelection, 500);

	// Add file system watchers to auto-refresh tree view when files change
	const workspaceRoot = aocProvider.root;
	if (workspaceRoot) {
		// Watch for changes in solutions directory structure (new folders, deleted folders)
		const solutionsPattern = new vscode.RelativePattern(workspaceRoot, 'solutions/**');
		const fileWatcher = vscode.workspace.createFileSystemWatcher(solutionsPattern);
		
		// Refresh on any file/folder create, delete, or change
		fileWatcher.onDidCreate(() => aocProvider.refresh());
		fileWatcher.onDidDelete(() => aocProvider.refresh());
		fileWatcher.onDidChange(() => aocProvider.refresh());
		
		context.subscriptions.push(fileWatcher);
	}
}

/**
 * Setup file watchers to detect when .aoc.json files are created or deleted
 */
function setupWorkspaceWatcher(
	context: vscode.ExtensionContext,
	workspaceService: AocWorkspaceService
) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return;
	}

	// Track whether providers have been initialized
	let providersInitialized = workspaceService.getAocWorkspaces().length > 0;

	for (const folder of workspaceFolders) {
		const pattern = new vscode.RelativePattern(folder, AOC_CONFIG_FILENAME);
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

		// When .aoc.json is created
		watcher.onDidCreate(async () => {
			await workspaceService.refresh();
			const aocWorkspaces = workspaceService.getAocWorkspaces();
			
			if (aocWorkspaces.length > 0) {
				await vscode.commands.executeCommand('setContext', 'aocWorkspaceDetected', true);
				
				// Initialize providers if not already done
				if (!providersInitialized) {
					await addProviders(context);
					providersInitialized = true;
					vscode.window.showInformationMessage('AOC workspace initialized successfully!');
				}
			}
		});

		// When .aoc.json is deleted
		watcher.onDidDelete(async () => {
			await workspaceService.refresh();
			const aocWorkspaces = workspaceService.getAocWorkspaces();
			
			if (aocWorkspaces.length === 0) {
				await vscode.commands.executeCommand('setContext', 'aocWorkspaceDetected', false);
				// Note: We don't un-initialize providers as that would require complex cleanup
				// The tree view will simply be hidden via the 'when' clause
			}
		});

		context.subscriptions.push(watcher);
	}
}

