import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import { ICommand } from '../common/types';
import { AocTreeDataProvider } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';
import { createRunner } from '../helpers/create-runner';
import { checkAndShowErrors } from '../helpers/check-file-errors';

@injectable()
export class DebugPartCommand implements ICommand {
    get id(): string {
        return 'aoc.debugPart';
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

        // Check for errors before debugging
        if (checkAndShowErrors(active.document)) {
            return;
        }

        // Save all unsaved files before debugging
        await vscode.workspace.saveAll();

            // Ensure temp directory exists
        try {
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
            }

            // For debugging, we need a simpler approach that allows breakpoints in the solution file
            // Instead of using a runner script, create a minimal wrapper that debugger can trace
            const debugWrapper = `
import * as fs from 'fs';
const solutionPath = '${solutionPath.replace(/\\/g, '\\\\')}';
const inputPath = '${inputPath.replace(/\\/g, '\\\\')}';
const part = ${part};

// Import the solution module dynamically
async function debug() {
    const solution = await import(solutionPath);
    const partFn = solution['part' + part];
    
    const input = fs.readFileSync(inputPath, 'utf-8');
    
    console.log('='.repeat(50));
    console.log(\`Debugging Part \${part}\`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    const result = await partFn(input);
    const elapsed = Date.now() - startTime;
    
    console.log('\\nResult:', result);
    console.log(\`Time: \${elapsed}ms\`);
    console.log('='.repeat(50));
}

debug().catch(console.error);
`;

            const debugWrapperPath = path.join(context.globalStorageUri.fsPath, `debug-part${part}.ts`);
            fs.writeFileSync(debugWrapperPath, debugWrapper, 'utf-8');

            // Locate ts-node/register within the extension
            // Only works if ts-node is a dependency of the extension
            const tsNodeRegisterPath = path.join(context.extensionPath, 'node_modules', 'ts-node', 'register', 'index.js');

            // Force ts-node to ignore the user's tsconfig.json and use its defaults
            // This ensures Node.js types are available even if user's config has lib: ["ES2021"]
            // Also configure source maps so breakpoints work in the debugger
            const env = {
                'TS_NODE_SKIP_PROJECT': 'true',
                'TS_NODE_FILES': 'true', // Process all .ts files, including dynamically required ones
                'TS_NODE_COMPILER_OPTIONS': JSON.stringify({
                    inlineSourceMap: true,
                    inlineSources: true,
                    sourceRoot: root,
                    outDir: context.globalStorageUri.fsPath
                })
            };

            // Create debug configuration using node and ts-node register
            const debugConfig: vscode.DebugConfiguration = {
                type: 'pwa-node',
                request: 'launch',
                name: `Debug Part ${part}`,
                program: debugWrapperPath,
                cwd: root,
                runtimeArgs: [
                    '-r',
                    tsNodeRegisterPath
                ],
                env: env,
                sourceMaps: true,
                resolveSourceMapLocations: [
                    '**',
                    '!**/node_modules/**'
                ],
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
