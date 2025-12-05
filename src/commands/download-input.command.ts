import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { AocSessionService } from '../services/aoc-session.service';
import { AocApiService } from '../services/aoc-api.service';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';

@injectable()
export class DownloadInputCommand implements ICommand {
    get id(): string {
        return 'aoc.downloadInput';
    }

    constructor(
        private sessionService: AocSessionService,
        private apiService: AocApiService,
        private aocProvider: AocTreeDataProvider
    ) {}

    public async execute(
        context: vscode.ExtensionContext,
        ...args: any[]
    ): Promise<void> {
        const root = this.aocProvider.root;
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        // Check if session is configured
        const hasSession = await this.sessionService.hasSession();
        if (!hasSession) {
            const choice = await vscode.window.showErrorMessage(
                'No Advent of Code session configured.',
                'Configure Now'
            );
            if (choice === 'Configure Now') {
                await vscode.commands.executeCommand('aoc.configureSession');
            }
            return;
        }

        // Get year and day from context or prompt
        const treeItem = args[0] as AocTreeItem | undefined;
        let year = treeItem?.year;
        let dayDir = treeItem?.dayDir;

        if (!year || !dayDir) {
            year = await vscode.window.showInputBox({
                prompt: 'Year',
                value: new Date().getFullYear().toString()
            });
            if (!year) {
                return;
            }

            const day = await vscode.window.showInputBox({
                prompt: 'Day (1-25)',
                validateInput: (value) => {
                    const n = Number(value);
                    return n >= 1 && n <= 25 ? undefined : 'Enter a number between 1 and 25';
                }
            });
            if (!day) {
                return;
            }

            dayDir = `day${day.padStart(2, '0')}`;
        }

        const inputPath = path.join(root, 'solutions', year, dayDir, 'input.txt');

        // Check if input already exists and has content
        if (fs.existsSync(inputPath)) {
            const content = fs.readFileSync(inputPath, 'utf-8');
            if (content.trim().length > 0) {
                const choice = await vscode.window.showWarningMessage(
                    'Input file already has content. Overwrite?',
                    'Yes',
                    'No'
                );
                if (choice !== 'Yes') {
                    return;
                }
            }
        }

        try {
            const session = await this.sessionService.getSession();
            if (!session) {
                vscode.window.showErrorMessage('Session token not found.');
                return;
            }

            const dayNum = dayDir.replace(/^day/, '');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Downloading input for ${year} Day ${dayNum}...`,
                cancellable: false
            }, async () => {
                const input = await this.apiService.downloadInput(year!, dayNum, session);

                // Ensure directory exists
                const dir = path.dirname(inputPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(inputPath, input, 'utf-8');
            });

            vscode.window.showInformationMessage(`Input downloaded for ${year} Day ${dayDir.replace(/^day/, '')}`);
            this.aocProvider.refresh();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to download input: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
