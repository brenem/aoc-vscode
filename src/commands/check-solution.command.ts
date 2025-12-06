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

        if (active.document.uri.scheme !== 'aoc-solution') {
             // If it's a regular file, we might not be able to map it back to the virtual scheme easily 
             // without more context, but usually we operate on the virtual files in this extension.
             // If the user happens to have the real file open, we can just check it directly, 
             // but `runPart` insists on `aoc-solution` scheme. We will stick to that to be safe.
            vscode.window.showErrorMessage('This command only works on Advent of Code solution files (virtual scheme).');
            return;
        }

        // Get real solution path from query parameter
        const query = new URLSearchParams(active.document.uri.query);
        const solutionPath = query.get('realPath');
        if (!solutionPath) {
            vscode.window.showErrorMessage('Could not find solution file path.');
            return;
        }

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
