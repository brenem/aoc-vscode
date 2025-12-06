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
import { SolutionFileSystemProvider } from './providers/solution-file-system-provider';
import { SolutionCodeLensProvider } from './providers/solution-codelens-provider';
import { AocSessionService } from './services/aoc-session.service';
import { AocApiService } from './services/aoc-api.service';
import { StatsService } from './services/stats.service';
import { PuzzleService } from './services/puzzle.service';
import { TreeViewService } from './services/tree-view.service';
import { PuzzleWebviewSerializer } from './services/puzzle-webview-serializer';
import { SolutionDiagnosticsService } from './services/solution-diagnostics.service';
import { ExtensionContext, ICommand, ICommandManager } from './common/types';
import { CommandManager } from './common/command-manager';
import { CheckSolutionCommand } from './commands/check-solution.command';

export function initialize(context: vscode.ExtensionContext): void {
	registerServices(context);
	addProviders(context);
}

function registerServices(context: vscode.ExtensionContext) {
	// Register context as a value for injection
	container.register(ExtensionContext, { useValue: context });

	// Register infrastructure
	container.registerSingleton(ICommandManager, CommandManager);

	// Register services
	container.registerSingleton(AocSessionService);
	container.registerSingleton(AocApiService);
	container.registerSingleton(StatsService);
	container.registerSingleton(PuzzleService);
	container.registerSingleton(TreeViewService);
	container.registerSingleton(SolutionFileSystemProvider);
	container.registerSingleton(SolutionCodeLensProvider);
	container.registerSingleton(AocTreeDataProvider);
	container.registerSingleton(SolutionDiagnosticsService);

	// Register commands
	container.register<ICommand>(ICommand, { useClass: GenerateDayCommand });
	container.register<ICommand>(ICommand, { useClass: OpenDayCommand });
	container.register<ICommand>(ICommand, { useClass: RunDayCommand });
	container.register<ICommand>(ICommand, { useClass: RefreshCommand });
	container.register<ICommand>(ICommand, { useClass: AddUtilityCommand });
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
}

function addProviders(context: vscode.ExtensionContext) {
	const solutionProvider = container.resolve(SolutionFileSystemProvider);
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('aoc-solution', solutionProvider, { isCaseSensitive: true }));

	const codeLensProvider = container.resolve(SolutionCodeLensProvider);
	context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'typescript', scheme: 'aoc-solution' }, codeLensProvider));
	
	const diagnosticsService = container.resolve(SolutionDiagnosticsService);
	diagnosticsService.initialize(context);

	// Register puzzle webview serializer
	const puzzleSerializer = container.resolve(PuzzleWebviewSerializer);
	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer('aocPuzzle', puzzleSerializer)
	);

	addTreeDataProvider(context);
}

function addTreeDataProvider(context: vscode.ExtensionContext) {
	// Get the provider instance and set up tree view
	const aocProvider = container.resolve(AocTreeDataProvider);
	const treeView = vscode.window.createTreeView('aocExplorer', {
		treeDataProvider: aocProvider
	});

	// Register tree view with service for programmatic access
	const treeViewService = container.resolve(TreeViewService);
	treeViewService.setTreeView(treeView);

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

