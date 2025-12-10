import * as vscode from 'vscode';

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

        // Add file navigation and "View Puzzle" at the top of the file
        const { year, day } = this.parseUri(document.uri);
        if (year && day) {
            // View Puzzle
            codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                title: '📖 View Puzzle',
                command: 'aoc.viewPuzzle',
                arguments: [year, day]
            }));

            // Get the real path to determine file locations
            const filePath = document.uri.fsPath;
            if (filePath) {
                const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
                const inputPath = `${dirPath}/input.txt`;
                const samplePath = `${dirPath}/sample.txt`;
                const dayDir = `day${day}`;

                // Open Input
                codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                    title: '📥 Open Input',
                    command: 'aoc.openInput',
                    arguments: [year, dayDir, inputPath]
                }));

                // Open Sample
                codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                    title: '📄 Open Sample',
                    command: 'aoc.openSample',
                    arguments: [year, dayDir, samplePath]
                }));
            }
        }

        // Find part1 and part2 function declarations
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const part1Match = line.match(/export\s+(async\s+)?function\s+part1\s*\(/);
            const part2Match = line.match(/export\s+(async\s+)?function\s+part2\s*\(/);

            if (part1Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                
                // Run with real input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 1',
                    command: 'aoc.runPart',
                    arguments: [1]
                }));
                
                // Run with sample input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 1 (Sample)',
                    command: 'aoc.runPartWithSample',
                    arguments: [1]
                }));
                
                // Debug with real input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 1',
                    command: 'aoc.debugPart',
                    arguments: [1]
                }));

                // Debug with sample input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 1 (Sample)',
                    command: 'aoc.debugPartWithSample',
                    arguments: [1]
                }));
            }

            if (part2Match) {
                const range = new vscode.Range(i, 0, i, line.length);
                
                // Run with real input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 2',
                    command: 'aoc.runPart',
                    arguments: [2]
                }));
                
                // Run with sample input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Part 2 (Sample)',
                    command: 'aoc.runPartWithSample',
                    arguments: [2]
                }));
                
                // Debug with real input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 2',
                    command: 'aoc.debugPart',
                    arguments: [2]
                }));

                // Debug with sample input
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐛 Debug Part 2 (Sample)',
                    command: 'aoc.debugPartWithSample',
                    arguments: [2]
                }));
            }
        }

        return codeLenses;
    }

    private isSolutionFile(uri: vscode.Uri): boolean {
        // For regular file URIs
        return !!(uri.fsPath && uri.fsPath.includes('solution.ts'));
    }

    private parseUri(uri: vscode.Uri): { year: string | null; day: string | null } {
        // Parse from fsPath
        const pathMatch = uri.fsPath?.match(/(\d{4}).*day(\d{2})/i);
        if (pathMatch) {
            return { year: pathMatch[1], day: pathMatch[2].padStart(2, '0') };
        }
        
        return { year: null, day: null };
    }
}
