import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';

/**
 * Interface representing parsed TypeScript compiler options
 */
export interface ParsedCompilerOptions {
	target: ts.ScriptTarget;
	module: ts.ModuleKind;
	lib?: string[];
	[key: string]: any;
}

/**
 * Read and parse tsconfig.json from the workspace root
 * @param workspaceRoot Path to the workspace root
 * @returns Parsed compiler options or default options if file not found
 */
export function readTsconfig(workspaceRoot: string): ts.CompilerOptions {
	const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
	
	// Check if tsconfig.json exists
	if (!fs.existsSync(tsconfigPath)) {
		// Return default options
		return getDefaultCompilerOptions();
	}

	try {
		// Read and parse the config file
		const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
		
		if (configFile.error) {
			console.warn('Error reading tsconfig.json:', configFile.error.messageText);
			return getDefaultCompilerOptions();
		}

		// Parse the JSON config
		const parsedConfig = ts.parseJsonConfigFileContent(
			configFile.config,
			ts.sys,
			workspaceRoot
		);

		if (parsedConfig.errors && parsedConfig.errors.length > 0) {
			console.warn('Error parsing tsconfig.json:', parsedConfig.errors[0].messageText);
			return getDefaultCompilerOptions();
		}

		// Return the compiler options
		return parsedConfig.options;

	} catch (error) {
		console.error('Failed to read tsconfig.json:', error);
		return getDefaultCompilerOptions();
	}
}

/**
 * Get default compiler options for AOC projects
 * @returns Default TypeScript compiler options
 */
export function getDefaultCompilerOptions(): ts.CompilerOptions {
	return {
		target: ts.ScriptTarget.ES2021,
		module: ts.ModuleKind.CommonJS,
		lib: ['lib.es2021.d.ts'],
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		esModuleInterop: true,
		skipLibCheck: true,
		noEmit: true,
		strict: true
	};
}

/**
 * Convert compiler options to TS_NODE_COMPILER_OPTIONS format
 * @param options TypeScript compiler options
 * @returns JSON string for TS_NODE_COMPILER_OPTIONS environment variable
 */
export function toTsNodeOptions(options: ts.CompilerOptions): string {
	// ts-node automatically provides Node.js types when running in Node.js
	// We only need to pass target and module, plus source map settings for debugging
	const tsNodeOptions: any = {
		module: 'commonjs', // ts-node requires commonjs
		target: ts.ScriptTarget[options.target || ts.ScriptTarget.ES2021].toLowerCase(),
		inlineSourceMap: true,
		inlineSources: true
	};

	return JSON.stringify(tsNodeOptions);
}
