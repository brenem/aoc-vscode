import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';
import { AocWorkspaceService } from '../services/aoc-workspace.service';
import { GitService } from '../services/git.service';
import { ReadmeService } from '../services/readme.service';
import { ICommand } from '../common/types';

/**
 * Command to initialize a new AOC project with .aoc.json configuration
 */
@injectable()
export class InitProjectCommand implements ICommand {
	public readonly id = 'aoc.initProject';

	constructor(
		private workspaceService: AocWorkspaceService,
		private gitService: GitService,
		private readmeService: ReadmeService
	) {}

	async execute(): Promise<void> {
		// Get the workspace folder to initialize
		const workspaceFolders = vscode.workspace.workspaceFolders;
		
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		// If multiple folders, let user choose
		let targetFolder: vscode.WorkspaceFolder;
		if (workspaceFolders.length > 1) {
			const selected = await vscode.window.showWorkspaceFolderPick({
				placeHolder: 'Select workspace folder to initialize as AOC project'
			});
			if (!selected) {
				return; // User cancelled
			}
			targetFolder = selected;
		} else {
			targetFolder = workspaceFolders[0];
		}

		// Check if already initialized
		const existingConfig = await this.workspaceService.getAocConfig(targetFolder.uri);
		if (existingConfig) {
			const overwrite = await vscode.window.showWarningMessage(
				'This workspace already has an AOC configuration. Do you want to reinitialize it?',
				'Yes',
				'No'
			);
			if (overwrite !== 'Yes') {
				return;
			}
		}

		// Prompt for language
		const language = await vscode.window.showQuickPick(
			['typescript', 'javascript'],
			{
				placeHolder: 'Select programming language',
				canPickMany: false
			}
		);

		if (!language) {
			return; // User cancelled
		}

		try {
			// Create .aoc.json
			await this.workspaceService.createConfig(targetFolder.uri, {
				language
			});

			// Create directory structure
			await this.createDirectoryStructure(targetFolder.uri.fsPath, language);

			// Refresh workspace cache
			await this.workspaceService.refresh();

			// Prompt for git initialization
			const initGit = await vscode.window.showInformationMessage(
				'Do you want to initialize a git repository?',
				'Yes',
				'No'
			);

			if (initGit === 'Yes') {
				await this.gitService.initialize(targetFolder.uri.fsPath, language);
			}

			vscode.window.showInformationMessage(
				'AOC project initialized successfully!'
			);

            // Create README
            await this.readmeService.create(targetFolder.uri.fsPath, language);

			// Set context to trigger extension activation
			await vscode.commands.executeCommand('setContext', 'aocWorkspaceDetected', true);

		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to initialize AOC project: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Create the standard AOC directory structure
	 */
	private async createDirectoryStructure(workspaceRoot: string, language: string): Promise<void> {
		const solutionsDir = path.join(workspaceRoot, 'solutions');
		const sharedDir = path.join(solutionsDir, 'shared');
		const utilsDir = path.join(sharedDir, 'utils');

		// Create directories if they don't exist
		if (!fs.existsSync(solutionsDir)) {
			await fs.promises.mkdir(solutionsDir, { recursive: true });
		}

		if (!fs.existsSync(sharedDir)) {
			await fs.promises.mkdir(sharedDir, { recursive: true });
		}

		if (!fs.existsSync(utilsDir)) {
			await fs.promises.mkdir(utilsDir, { recursive: true });
		}

		// Create tsconfig.json for TypeScript projects
		if (language === 'typescript') {
			const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
			if (!fs.existsSync(tsconfigPath)) {
				const templatePath = path.join(__dirname, '..', '..', 'templates', 'tsconfig.json');
				if (fs.existsSync(templatePath)) {
					await fs.promises.copyFile(templatePath, tsconfigPath);
				}
			}
		}

		// Create a sample utility file based on language
		const utilityFileName = language === 'typescript' ? 'helpers.ts' : 
		                        language === 'javascript' ? 'helpers.js' :
		                        language === 'python' ? 'helpers.py' : 'helpers.txt';
		
		const utilityFilePath = path.join(utilsDir, utilityFileName);

		if (!fs.existsSync(utilityFilePath)) {
			let content = '';
			if (language === 'typescript' || language === 'javascript') {
				content = `// Shared utility functions for Advent of Code\n\n`;
				content += `export function readLines(input: string): string[] {\n`;
				content += `    return input.trim().split('\\n');\n`;
				content += `}\n`;
			} else if (language === 'python') {
				content = `# Shared utility functions for Advent of Code\n\n`;
				content += `def read_lines(input_str):\n`;
				content += `    return input_str.strip().split('\\n')\n`;
			}

			if (content) {
				await fs.promises.writeFile(utilityFilePath, content, 'utf-8');
			}
		}
	}
}
