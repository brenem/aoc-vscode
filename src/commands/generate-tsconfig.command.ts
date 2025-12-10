import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';
import { AocWorkspaceService } from '../services/aoc-workspace.service';
import { ICommand } from '../common/types';

/**
 * Command to generate tsconfig.json for TypeScript AOC projects
 */
@injectable()
export class GenerateTsconfigCommand implements ICommand {
	public readonly id = 'aoc.generateTsconfig';

	constructor(private workspaceService: AocWorkspaceService) {}

	async execute(): Promise<void> {
		// Get the workspace folder
		const workspaceFolders = vscode.workspace.workspaceFolders;
		
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}

		// If multiple folders, let user choose
		let targetFolder: vscode.WorkspaceFolder;
		if (workspaceFolders.length > 1) {
			const selected = await vscode.window.showWorkspaceFolderPick({
				placeHolder: 'Select workspace folder to generate tsconfig.json'
			});
			if (!selected) {
				return; // User cancelled
			}
			targetFolder = selected;
		} else {
			targetFolder = workspaceFolders[0];
		}

		// Check if this is an AOC project
		const config = await this.workspaceService.getAocConfig(targetFolder.uri);
		if (!config) {
			vscode.window.showErrorMessage('This is not an AOC project. Run "AoC: Initialize Project" first.');
			return;
		}

		// Check if language is TypeScript
		if (config.language !== 'typescript') {
			vscode.window.showErrorMessage('This command only works for TypeScript AOC projects.');
			return;
		}

		const tsconfigPath = path.join(targetFolder.uri.fsPath, 'tsconfig.json');

		// Check if tsconfig.json already exists
		if (fs.existsSync(tsconfigPath)) {
			const overwrite = await vscode.window.showWarningMessage(
				'tsconfig.json already exists. Do you want to overwrite it?',
				'Yes',
				'No'
			);
			if (overwrite !== 'Yes') {
				return;
			}
		}

		try {
			// Copy template
			const templatePath = path.join(__dirname, '..', '..', 'templates', 'tsconfig.json');
			if (!fs.existsSync(templatePath)) {
				vscode.window.showErrorMessage('tsconfig.json template not found.');
				return;
			}

			await fs.promises.copyFile(templatePath, tsconfigPath);

			vscode.window.showInformationMessage('tsconfig.json generated successfully!');

			// Open the file
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(tsconfigPath));
			await vscode.window.showTextDocument(doc);

		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to generate tsconfig.json: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}
