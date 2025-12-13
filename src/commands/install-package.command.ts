import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';


/**
 * Command to install an npm package in the workspace
 */
@injectable()
export class InstallPackageCommand implements ICommand {
    public readonly id = 'aoc.installPackage';

    constructor() {}

    async execute(): Promise<void> {
        // Get the workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
            return;
        }

        // If multiple folders, let user choose (simplified, usually taking the first or active)
        // For better UX, we can pick the one that is an AOC project
        let targetFolder: vscode.WorkspaceFolder | undefined;
        if (workspaceFolders.length > 1) {
            targetFolder = await vscode.window.showWorkspaceFolderPick({
                placeHolder: 'Select workspace folder to install package in'
            });
        } else {
            targetFolder = workspaceFolders[0];
        }

        if (!targetFolder) {
            return;
        }

        // Prompt for package name
        const packageName = await vscode.window.showInputBox({
            prompt: 'Enter npm package name to install (e.g. lodash)',
            placeHolder: 'lodash'
        });

        if (!packageName) {
            return;
        }

        const rootPath = targetFolder.uri.fsPath;
        const packageJsonPath = path.join(rootPath, 'package.json');

        // Check if package.json exists
        if (!fs.existsSync(packageJsonPath)) {
            const initResponse = await vscode.window.showInformationMessage(
                'No package.json found. Initialize npm project first?',
                'Yes',
                'No'
            );

            if (initResponse !== 'Yes') {
                return;
            }

            await this.runCommand('npm init -y', rootPath, 'Initializing npm...');
        }

        // Install package
        try {
            await this.runCommand(`npm install ${packageName}`, rootPath, `Installing ${packageName}...`);
            
            // Ask to install types
            const installTypes = await vscode.window.showInformationMessage(
                `Package installed. specific types package (@types/${packageName}) usually helps with Intellisense. Install it?`,
                'Yes', 'No'
            );

            if (installTypes === 'Yes') {
                try {
                    await this.runCommand(`npm install -D @types/${packageName}`, rootPath, `Installing @types/${packageName}...`);
                } catch (e) {
                    vscode.window.showWarningMessage(`Failed to install types. They might not exist or are already included.`);
                }
            }
            
            vscode.window.showInformationMessage(`Successfully installed ${packageName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install package: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async runCommand(command: string, cwd: string, title: string): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: false
        }, async () => {
             return new Promise<void>((resolve, reject) => {
                exec(command, { cwd }, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
}
