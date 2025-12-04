import * as vscode from 'vscode';
import * as path from 'path';

export class SolutionCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Only provide CodeLens for solution files in the solutions/YYYY/dayXX/ structure
        if (!this.isSolutionFile(document.uri)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Find part1 and part2 function declarations
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const part1Match = line.match(/export\s+function\s+part1\s*\(/);
            const part2Match = line.match(/export\s+function\s+part2\s*\(/);

            if (part1Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                const command: vscode.Command = {
                    title: '▶ Run Part 1',
                    command: 'aoc.runPart',
                    arguments: [1]
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }

            if (part2Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                const command: vscode.Command = {
                    title: '▶ Run Part 2',
                    command: 'aoc.runPart',
                    arguments: [2]
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }

        return codeLenses;
    }

    private isSolutionFile(uri: vscode.Uri): boolean {
        // For virtual aoc-solution URIs, there's no fsPath
        // Just check if it's using our custom scheme
        return uri.scheme === 'aoc-solution';
    }
}
