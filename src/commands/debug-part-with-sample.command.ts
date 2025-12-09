import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';
import { createRunner } from '../helpers/create-runner';

@injectable()
export class DebugPartWithSampleCommand implements ICommand {
    get id(): string {
        return 'aoc.debugPartWithSample';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        const root = this.aocProvider.root;
        const part = Number(args[0]) || NaN;

        if (part < 1 || part > 2 || isNaN(part)) {
            vscode.window.showErrorMessage('Invalid part specified.');
            return;
        }

        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        const active = vscode.window.activeTextEditor;
        if (!active) {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Check if this is a solution file
        const filePath = active.document.uri.fsPath;
        if (!filePath.includes('solution.ts')) {
            vscode.window.showErrorMessage('Open a solution file first.');
            return;
        }

        // Parse year and day from file path: .../solutions/YYYY/dayXX/solution.ts
        const segments = filePath.split(path.sep);
        const solutionsIndex = segments.lastIndexOf('solutions');
        if (solutionsIndex === -1 || solutionsIndex + 3 > segments.length) {
            vscode.window.showErrorMessage('This file is not inside a solutions/YYYY/dayXX/ folder.');
            return;
        }

        const year = segments[solutionsIndex + 1];
        const dayDir = segments[solutionsIndex + 2];
        const dayNum = dayDir.replace(/^day/, '');
        const solutionPath = filePath;

        const inputPath = path.join(root, 'solutions', year, dayDir, 'input.txt');
        const samplePath = path.join(root, 'solutions', year, dayDir, 'sample.txt');

        // Check if sample.txt exists
        if (!fs.existsSync(samplePath)) {
            vscode.window.showErrorMessage('sample.txt not found. Please create it first.');
            return;
        }

        try {
            // Ensure temp directory exists FIRST
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
            }

            // Create runner script (TypeScript) for solution.ts
            // createRunner now handles the import path adjustment
            const runnerPath = createRunner({
                solutionPath: solutionPath, 
                inputPath,
                part: part as 1 | 2,
                tempDir: context.globalStorageUri.fsPath,
                inputSource: 'sample'
            });

            // Locate ts-node/register within the extension
            const tsNodeRegisterPath = path.join(context.extensionPath, 'node_modules', 'ts-node', 'register', 'index.js');

            // Create debug configuration using node and ts-node register
            const debugConfig: vscode.DebugConfiguration = {
                type: 'node',
                request: 'launch',
                name: `Debug Part ${part} (Sample)`,
                program: runnerPath,
                cwd: root,
                runtimeArgs: [
                    '-r',
                    tsNodeRegisterPath
                ],
                env: {
                    'TS_NODE_COMPILER_OPTIONS': '{"module":"commonjs"}'
                },
                console: 'integratedTerminal',
                internalConsoleOptions: 'neverOpen',
                skipFiles: ['<node_internals>/**'],
            };

            // Start debugging
            await vscode.debug.startDebugging(undefined, debugConfig);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to debug part: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
