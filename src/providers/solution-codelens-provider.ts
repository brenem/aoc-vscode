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

        // Add "View Puzzle" at the top of the file
        const { year, day } = this.parseUri(document.uri);
        if (year && day) {
            codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                title: '📖 View Puzzle',
                command: 'aoc.viewPuzzle',
                arguments: [year, day]
            }));
        }

        // Find part1 and part2 function declarations
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const part1Match = line.match(/export\s+function\s+part1\s*\(/);
            const part2Match = line.match(/export\s+function\s+part2\s*\(/);

            if (part1Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                
                // Run button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 1',
                    command: 'aoc.runPart',
                    arguments: [1]
                }));
                
                // Debug button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 1',
                    command: 'aoc.debugPart',
                    arguments: [1]
                }));
            }

            if (part2Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                
                // Run button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 2',
                    command: 'aoc.runPart',
                    arguments: [2]
                }));
                
                // Debug button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 2',
                    command: 'aoc.debugPart',
                    arguments: [2]
                }));
            }
        }

        return codeLenses;
    }

    private isSolutionFile(uri: vscode.Uri): boolean {
        // For virtual aoc-solution URIs, there's no fsPath
        if (uri.scheme === 'aoc-solution') {
            return uri.path.endsWith('solution.ts');
        }
        
        // For regular file URIs
        return !!(uri.fsPath && uri.fsPath.includes('solution.ts'));
    }

    private parseUri(uri: vscode.Uri): { year: string | null; day: string | null } {
        // Format: /YYYY, Day DD: filename.ts
        const match = uri.path.match(/^\/(\d{4}),\s*Day\s*(\d{2}):/);
        if (match) {
            return { year: match[1], day: match[2] };
        }
        
        // Fallback to fsPath parsing
        const pathMatch = uri.fsPath?.match(/(\d{4}).*day(\d{2})/i);
        if (pathMatch) {
            return { year: pathMatch[1], day: pathMatch[2].padStart(2, '0') };
        }
        
        return { year: null, day: null };
    }
}
