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
import { SubmitSolutionCommand } from './commands/submit-solution.command';
import { RefreshPuzzleCommand } from './commands/refresh-puzzle.command';
import { MarkPartSolvedCommand } from './commands/mark-part-solved.command';
import { DebugStatsCommand } from './commands/debug-stats.command';
import { SubmissionService } from './services/submission.service';

export function initialize(context: vscode.ExtensionContext): void {
	registerServices(context);
	addProviders(context);
}

function registerServices(context: vscode.ExtensionContext) {
	// Register context as a value for injection
	container.register(ExtensionContext, { useValue: context });

	// Register infrastructure
	container.registerSingleton(ICommandManager, CommandManager);
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

function addProviders(context: vscode.ExtensionContext) {
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
			if (editor) {
				const filePath = editor.document.uri.fsPath;
				if (filePath && filePath.includes('solution.ts')) {
					// Parse year and day from file path: .../solutions/YYYY/dayXX/solution.ts
					const segments = filePath.split('/').filter(Boolean);
					const solutionsIndex = segments.lastIndexOf('solutions');
					if (solutionsIndex !== -1 && solutionsIndex + 2 < segments.length) {
						const year = segments[solutionsIndex + 1];
						const dayDir = segments[solutionsIndex + 2];
						const fileName = 'solution.ts';

						// Find the corresponding tree item (the file, not the day)
						const fileItem = new AocTreeItem(
							fileName,
							vscode.TreeItemCollapsibleState.None,
							'dayFile',
							year,
							dayDir,
							filePath
						);

						// Reveal the item in the tree view
						treeView.reveal(fileItem, { select: true, focus: false });
					}
				}
			}
		})
	);
}

