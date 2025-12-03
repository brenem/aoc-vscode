import * as vscode from 'vscode';
import * as path from 'path';

export async function runDay(root: string, part: 1 | 2) {
    if (!root) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
    }

    const active = vscode.window.activeTextEditor;
    if (!active) {
        vscode.window.showErrorMessage('Open a day solution file first.');
        return;
    }

    const filePath = active.document.uri.fsPath;
    // naive parse to find year/day by path: .../aoc/YYYY/dayXX/solution.ts
    const segments = filePath.split(path.sep);
    const solutionIndex = segments.lastIndexOf('solution.ts');
    // not super robust, so we'll do something simpler:
    const aocIndex = segments.lastIndexOf('aoc');
    if (aocIndex === -1 || aocIndex + 3 > segments.length) {
        vscode.window.showErrorMessage('This file is not inside an aoc/YYYY/dayXX/ folder.');
        return;
    }

    const year = segments[aocIndex + 1];
    const dayDir = segments[aocIndex + 2];
    const inputPath = path.join(root, 'aoc', year, dayDir, 'input.txt');

    const terminal =
        vscode.window.terminals.find(t => t.name === 'AoC Runner') ??
        vscode.window.createTerminal('AoC Runner');

    terminal.show();

    // here you can wire to whatever runner you want.
    // example assuming you have a script or ts-node setup:
    // node ./scripts/run-aoc.js 2025 01 1
    const dayNumber = dayDir.replace(/^day/, '');
    terminal.sendText(`npm run aoc -- ${year} ${dayNumber} ${part}`);
}
