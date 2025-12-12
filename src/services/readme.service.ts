import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';

@injectable()
export class ReadmeService {
    /**
     * Create a README.md file in the specified root path
     */
    async create(rootPath: string, language: string): Promise<void> {
        const readmePath = path.join(rootPath, 'README.md');

        if (fs.existsSync(readmePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                'README.md already exists. Do you want to overwrite it?',
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') {
                return;
            }
        }

        const content = this.generateContent(language);
        await fs.promises.writeFile(readmePath, content, 'utf-8');
        
        vscode.window.showInformationMessage('README.md created successfully!');
    }

    private generateContent(language: string): string {
        const isTs = language === 'typescript';
        const isPython = language === 'python';
        const isJs = language === 'javascript';

        let runCommand = '';
        let debugInstructions = '';

        if (isTs) {
            runCommand = 'npx ts-node solutions/YYYY/dayXX/solution.ts';
            debugInstructions = `
1. Open a solution file (e.g., \`solutions/2023/day01/solution.ts\`).
2. Add breakpoints.
3. Open the "Run and Debug" view.
4. Select "AoC: Debug Part" or "AoC: Debug Part (Sample)".
5. Press F5.`;
        } else if (isJs) {
             runCommand = 'node solutions/YYYY/dayXX/solution.js';
             debugInstructions = `
1. Open a solution file.
2. Add breakpoints.
3. Open the "Run and Debug" view.
4. Select "Launch Program".
5. Press F5.`;
        } else if (isPython) {
             runCommand = 'python3 solutions/YYYY/dayXX/solution.py';
             debugInstructions = `
1. Open a solution file.
2. Add breakpoints.
3. Select the python interpreter.
4. Press F5.`;
        }

        return `# Advent of Code Solutions

This repository contains solutions for [Advent of Code](https://adventofcode.com/) puzzles.

## Prerequisites

To run and debug these solutions effectively, you need:

1.  **Visual Studio Code**
2.  **[Advent of Code VS Code Extension](https://marketplace.visualstudio.com/items?itemName=brenem.aoc-vscode)** (Dependency)
${isTs ? '3.  **Node.js** and **npm**\n' : ''}
${isPython ? '3.  **Python 3**\n' : ''}

> [!IMPORTANT]
> The **Advent of Code VS Code Extension** is required for features like automatic input downloading, solution running, and submission.

## Usage

### Running Solutions

The easiest way to run your solutions is using the **CodeLens** links that appear directly above your code in the editor:

-   Click **Run Part 1** or **Run Part 2** to execute the specific part with your real input.
-   Click **Debug Part 1** or **Debug Part 2** to debug the specific part.

You can also use the command palette to run these commands.

### Working with Samples
 
A \`sample.txt\` file is created for you in the day's folder. You can use this file to test your solution with example data.
-   Use **CodeLens** to "Run (Sample)" or "Debug (Sample)" using this file.

### Puzzle View

When you open a day, the puzzle description is shown in a webview.
-   **Copy to Clipboard**: detailed sample inputs in the description often have a "Copy" button added by the extension for easy transfer to your \`sample.txt\`.

### Project Structure

-   \`solutions/\`: Contains solution files organized by year and day.
    -   \`solutions/shared/\`: Shared utilities and functionality.
    -   Example: \`solutions/2023/day01/\`
        -   \`solution.ts\`: Your code.
        -   \`input.txt\`: The puzzle input.
        -   \`sample.txt\`: Sample input.
${isTs ? '-   \`tsconfig.json\`: TypeScript configuration.' : ''}
`;
    }
}
