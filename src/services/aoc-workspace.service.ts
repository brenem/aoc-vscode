import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable } from 'tsyringe';
import { AocConfig, AOC_CONFIG_FILENAME, DEFAULT_AOC_CONFIG } from '../common/aoc-config.interface';

/**
 * Service for managing AOC workspace detection and configuration
 */
@injectable()
export class AocWorkspaceService {
	private aocWorkspaces: Map<string, AocConfig> = new Map();
	private _onDidChangeWorkspaces = new vscode.EventEmitter<void>();
	public readonly onDidChangeWorkspaces = this._onDidChangeWorkspaces.event;

	/**
	 * Scan all workspace folders for .aoc.json files
	 */
	async findAocWorkspaces(): Promise<string[]> {
		this.aocWorkspaces.clear();

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			return [];
		}

		const aocFolders: string[] = [];

		for (const folder of workspaceFolders) {
			const configPath = path.join(folder.uri.fsPath, AOC_CONFIG_FILENAME);
			
			if (fs.existsSync(configPath)) {
				try {
					const config = await this.getAocConfig(folder.uri);
					if (config) {
						this.aocWorkspaces.set(folder.uri.fsPath, config);
						aocFolders.push(folder.uri.fsPath);
					}
				} catch (error) {
					console.error(`Failed to parse ${AOC_CONFIG_FILENAME} in ${folder.uri.fsPath}:`, error);
				}
			}
		}

		return aocFolders;
	}

	/**
	 * Get the AOC configuration for a specific workspace
	 */
	async getAocConfig(workspaceUri: vscode.Uri): Promise<AocConfig | null> {
		const configPath = path.join(workspaceUri.fsPath, AOC_CONFIG_FILENAME);

		if (!fs.existsSync(configPath)) {
			return null;
		}

		try {
			const content = await fs.promises.readFile(configPath, 'utf-8');
			const config = JSON.parse(content) as AocConfig;
			
			if (this.validateConfig(config)) {
				return config;
			} else {
				console.error(`Invalid ${AOC_CONFIG_FILENAME} structure in ${workspaceUri.fsPath}`);
				return null;
			}
		} catch (error) {
			console.error(`Error reading ${AOC_CONFIG_FILENAME}:`, error);
			return null;
		}
	}

	/**
	 * Validate the structure of an AOC configuration
	 */
	validateConfig(config: any): config is AocConfig {
		return (
			typeof config === 'object' &&
			config !== null &&
			typeof config.language === 'string' &&
			typeof config.version === 'string'
		);
	}

	/**
	 * Create a new .aoc.json configuration file
	 */
	async createConfig(
		workspaceUri: vscode.Uri,
		options?: Partial<AocConfig>
	): Promise<void> {
		const configPath = path.join(workspaceUri.fsPath, AOC_CONFIG_FILENAME);

		// Check if config already exists
		if (fs.existsSync(configPath)) {
			throw new Error(`${AOC_CONFIG_FILENAME} already exists in this workspace`);
		}

		const config: AocConfig = {
			...DEFAULT_AOC_CONFIG,
			...options
		};

		const content = JSON.stringify(config, null, 2);
		await fs.promises.writeFile(configPath, content, 'utf-8');

		// Add to cache
		this.aocWorkspaces.set(workspaceUri.fsPath, config);
		this._onDidChangeWorkspaces.fire();
	}

	/**
	 * Check if a workspace is an AOC workspace
	 */
	isAocWorkspace(workspaceUri: vscode.Uri): boolean {
		return this.aocWorkspaces.has(workspaceUri.fsPath);
	}

	/**
	 * Get the first AOC workspace (for single-workspace scenarios)
	 */
	getFirstAocWorkspace(): string | undefined {
		const workspaces = Array.from(this.aocWorkspaces.keys());
		return workspaces.length > 0 ? workspaces[0] : undefined;
	}

	/**
	 * Get all detected AOC workspaces
	 */
	getAocWorkspaces(): string[] {
		return Array.from(this.aocWorkspaces.keys());
	}

	/**
	 * Get the cached config for a workspace
	 */
	getCachedConfig(workspaceUri: vscode.Uri): AocConfig | undefined {
		return this.aocWorkspaces.get(workspaceUri.fsPath);
	}

	/**
	 * Rescan workspaces and update cache
	 */
	async refresh(): Promise<void> {
		await this.findAocWorkspaces();
		this._onDidChangeWorkspaces.fire();
	}
}
