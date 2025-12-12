import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { injectable } from 'tsyringe';
import { promisify } from 'util';

const exec = promisify(cp.exec);

@injectable()
export class GitService {
    /**
     * Initialize a git repository in the specified root path
     */
    async initialize(rootPath: string, language?: string): Promise<void> {
        try {
            // Check if git is installed
            try {
                await exec('git --version');
            } catch (error) {
                throw new Error('Git is not installed or not in the PATH.');
            }

            // check if .git already exists
            const gitDir = path.join(rootPath, '.git');
            if (fs.existsSync(gitDir)) {
                 const proceed = await vscode.window.showWarningMessage(
                    'A git repository already exists in this folder. do you want to re-initialize?',
                    'Yes',
                    'No'
                );
                if (proceed !== 'Yes') {
                    return;
                }
            }

            // Initialize git repo
            await exec('git init', { cwd: rootPath });

            // Create .gitignore
            await this.createGitignore(rootPath, language);

            vscode.window.showInformationMessage('Git repository initialized successfully!');

        } catch (error) {
             vscode.window.showErrorMessage(
                `Failed to initialize git repository: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    private async createGitignore(rootPath: string, language?: string): Promise<void> {
        const gitignorePath = path.join(rootPath, '.gitignore');
        
        const ignoreList = [
            'node_modules/',
            'out/',
            '.vscode-test/',
            '*.log',
            '.DS_Store',
            'input.txt',
            'inputs/',
            '*.js.map'
        ];

        // Add tsc generated files if typescript
        let isTypescript = language === 'typescript';
        if (!language) {
            // Auto-detect
            isTypescript = fs.existsSync(path.join(rootPath, 'tsconfig.json'));
        }

        if (isTypescript) {
            ignoreList.push('*.js');
            ignoreList.push('*.d.ts');
            ignoreList.push('*.tsbuildinfo');
        }

        const ignoreContent = [...ignoreList, ''].join('\n');

        if (fs.existsSync(gitignorePath)) {
            // Append if exists, but check if we need a newline
            const currentContent = await fs.promises.readFile(gitignorePath, 'utf8');
            const prefix = currentContent.endsWith('\n') ? '' : '\n';
            await fs.promises.appendFile(gitignorePath, prefix + ignoreContent);
        } else {
            await fs.promises.writeFile(gitignorePath, ignoreContent);
        }
    }
}
