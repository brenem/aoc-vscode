import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { ReadmeService } from '../services/readme.service';

/**
 * Command to generate a README.md file for an existing project
 */
@injectable()
export class GenerateReadmeCommand implements ICommand {
    public readonly id = 'aoc.generateReadme';

    constructor(private readmeService: ReadmeService) {}

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
                placeHolder: 'Select workspace folder to generate README for'
            });
            if (!selected) {
                return; // User cancelled
            }
            targetFolder = selected;
        } else {
            targetFolder = workspaceFolders[0];
        }

        // Detect language or ask user
        const language = await this.detectOrAskLanguage(targetFolder.uri.fsPath);
        if (!language) {
            return;
        }

        await this.readmeService.create(targetFolder.uri.fsPath, language);
    }

    private async detectOrAskLanguage(rootPath: string): Promise<string | undefined> {
        // Try simple detection
        if (fs.existsSync(path.join(rootPath, 'tsconfig.json'))) {
            return 'typescript';
        }
         if (fs.existsSync(path.join(rootPath, 'package.json'))) {
             // could be js, but if no tsconfig, assume js
            return 'javascript';
        }
        
        // Ask user
        return vscode.window.showQuickPick(
            ['typescript', 'javascript', 'python', 'other'],
            {
                placeHolder: 'Select programming language for README instructions',
                canPickMany: false
            }
        );
    }
}
