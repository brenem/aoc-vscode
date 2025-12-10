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

/**
 * Convert TypeScript CompilerOptions (with enum values) to plain object with string values
 * This is needed because ts-node expects string values when passing via TS_NODE_COMPILER_OPTIONS
 * @param options TypeScript compiler options
 * @returns Plain object with string values
 */
export function convertCompilerOptionsToStrings(options: ts.CompilerOptions): Record<string, any> {
	const result: Record<string, any> = {};
	
	for (const [key, value] of Object.entries(options)) {
		// Convert specific enum values to strings
		switch (key) {
			case 'target':
				result[key] = value !== undefined ? ts.ScriptTarget[value as ts.ScriptTarget].toLowerCase() : undefined;
				break;
			case 'module':
				result[key] = value !== undefined ? ts.ModuleKind[value as ts.ModuleKind].toLowerCase() : undefined;
				break;
			case 'moduleResolution':
				result[key] = value !== undefined ? ts.ModuleResolutionKind[value as ts.ModuleResolutionKind].toLowerCase() : undefined;
				break;
			case 'jsx':
				result[key] = value !== undefined ? ts.JsxEmit[value as ts.JsxEmit].toLowerCase() : undefined;
				break;
			case 'newLine':
				result[key] = value !== undefined ? ts.NewLineKind[value as ts.NewLineKind] : undefined;
				break;
			default:
				// For other properties, keep as-is
				result[key] = value;
		}
	}
	
	return result;
}
