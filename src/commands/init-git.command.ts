import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { GitService } from '../services/git.service';

/**
 * Command to initialize a git repository in an existing project
 */
@injectable()
export class InitGitCommand implements ICommand {
    public readonly id = 'aoc.initGit';

    constructor(private gitService: GitService) {}

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
                placeHolder: 'Select workspace folder to initialize git repository'
            });
            if (!selected) {
                return; // User cancelled
            }
            targetFolder = selected;
        } else {
            targetFolder = workspaceFolders[0];
        }

        await this.gitService.initialize(targetFolder.uri.fsPath);
    }
}
