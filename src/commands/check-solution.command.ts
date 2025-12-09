import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { SolutionDiagnosticsService } from '../services/solution-diagnostics.service';

@injectable()
export class CheckSolutionCommand implements ICommand {
    
    get id(): string {
        return 'aoc.checkSolution';
    }

    constructor(
        private diagnosticsService: SolutionDiagnosticsService
    ) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const active = vscode.window.activeTextEditor;
        if (!active) {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Check if this is a solution file
        const filePath = active.document.uri.fsPath;
        if (!filePath.includes('solution.ts')) {
            vscode.window.showErrorMessage('This command only works on Advent of Code solution files.');
            return;
        }

        const solutionPath = filePath;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Checking solution..."
        }, async () => {
            const success = this.diagnosticsService.checkSolution(active.document.uri, solutionPath, active.document.getText());
             if (success) {
                vscode.window.setStatusBarMessage('$(check) Solution check passed', 3000);
            } else {
                vscode.window.setStatusBarMessage('$(error) Solution check failed', 3000);
                // Reveal problems panel if there are errors? 
                // vscode.commands.executeCommand('workbench.actions.view.problems');
            }
        });
    }
}
