import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { injectable } from "inversify";

export class AocTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: 'year' | 'day' | 'dayFile' | 'shared' | 'utilsFolder' | 'utilityFile',
        public readonly year?: string,
        public readonly dayDir?: string,
        public readonly filePath?: string,
    ) {
        super(label, collapsibleState);
    }
}

@injectable()
export class AocTreeDataProvider implements vscode.TreeDataProvider<AocTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AocTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string) { }

    get root(): string {
        return this.workspaceRoot;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AocTreeItem): vscode.TreeItem {
        return element;
    }

    getParent(element: AocTreeItem): AocTreeItem | undefined {
        // Day items have a year parent
        if (element.contextValue === 'day' && element.year) {
            return new AocTreeItem(
                element.year,
                vscode.TreeItemCollapsibleState.Collapsed,
                'year',
                element.year,
                undefined
            );
        }
        
        // Day files have a day parent
        if (element.contextValue === 'dayFile' && element.year && element.dayDir) {
            const dayNum = element.dayDir.replace(/^day/, '').padStart(2, '0');
            return new AocTreeItem(
                `Day ${dayNum}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'day',
                element.year,
                element.dayDir
            );
        }
        
        // Utility files have utilsFolder parent
        if (element.contextValue === 'utilityFile') {
            return new AocTreeItem(
                'utils',
                vscode.TreeItemCollapsibleState.Collapsed,
                'utilsFolder'
            );
        }
        
        // utilsFolder has shared parent
        if (element.contextValue === 'utilsFolder') {
            return new AocTreeItem(
                'Shared',
                vscode.TreeItemCollapsibleState.Collapsed,
                'shared'
            );
        }
        
        // Year and Shared items are at root level
        return undefined;
    }

    async getChildren(element?: AocTreeItem): Promise<AocTreeItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('Open a workspace to use AoC Explorer');
            return [];
        }

        if (!element) {
            const solutionsRoot = path.join(this.workspaceRoot, 'solutions');

            // auto-create solutions directory if missing
            if (!fs.existsSync(solutionsRoot)) {
                return [];
            }

            const items: AocTreeItem[] = [];

            // Add shared folder if it exists
            const sharedDir = path.join(solutionsRoot, 'shared');
            if (fs.existsSync(sharedDir)) {
                items.push(new AocTreeItem(
                    'Shared',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'shared'
                ));
            }

            const years = fs
                .readdirSync(solutionsRoot, { withFileTypes: true })
                .filter(d => d.isDirectory() && d.name !== 'shared')
                .map(d => d.name)
                .sort();

            items.push(...years.map(year => new AocTreeItem(
                year,
                vscode.TreeItemCollapsibleState.Collapsed,
                'year',
                year,
                undefined
            )));

            return items;
        }

        if (element.contextValue === 'year' && element.year) {
            // children: days for given year
            const yearDir = path.join(this.workspaceRoot, 'solutions', element.year);
            if (!fs.existsSync(yearDir)) {
                return [];
            }

            const days = fs
                .readdirSync(yearDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .sort();

            return days.map(dayDirName => {
                const label = `Day ${dayDirName.replace(/^day/, '').padStart(2, '0')}`;

                const item = new AocTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'day',
                    element.year!,
                    dayDirName
                );

                return item;
            });
        }

        // Handle day items - show solution.ts and input.txt
        if (element.contextValue === 'day' && element.year && element.dayDir) {
            const dayDir = path.join(this.workspaceRoot, 'solutions', element.year, element.dayDir);
            const solutionPath = path.join(dayDir, 'solution.ts');
            const inputPath = path.join(dayDir, 'input.txt');

            const files: AocTreeItem[] = [];

            // Add solution.ts
            if (fs.existsSync(solutionPath)) {
                const solutionItem = new AocTreeItem(
                    'solution.ts',
                    vscode.TreeItemCollapsibleState.None,
                    'dayFile',
                    element.year,
                    element.dayDir,
                    solutionPath
                );
                solutionItem.command = {
                    command: 'aoc.openDay',
                    title: 'Open Solution',
                    arguments: [element] // Pass the parent day item
                };
                files.push(solutionItem);
            }

            // Add input.txt
            if (fs.existsSync(inputPath)) {
                const inputItem = new AocTreeItem(
                    'input.txt',
                    vscode.TreeItemCollapsibleState.None,
                    'dayFile',
                    element.year,
                    element.dayDir,
                    inputPath
                );
                inputItem.command = {
                    command: 'aoc.openInput',
                    title: 'Open Input',
                    arguments: [element.year, element.dayDir, inputPath]
                };
                files.push(inputItem);
            }

            return files;
        }

        // Handle shared folder - show utils subfolder
        if (element.contextValue === 'shared') {
            const utilsDir = path.join(this.workspaceRoot, 'solutions', 'shared', 'utils');
            if (fs.existsSync(utilsDir)) {
                return [new AocTreeItem(
                    'utils',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'utilsFolder'
                )];
            }
            return [];
        }

        // Handle utils folder - show individual files
        if (element.contextValue === 'utilsFolder') {
            const utilsDir = path.join(this.workspaceRoot, 'solutions', 'shared', 'utils');
            if (!fs.existsSync(utilsDir)) {
                return [];
            }

            const files = fs.readdirSync(utilsDir)
                .filter(f => f.endsWith('.ts'))
                .sort();

            return files.map(file => {
                const filePath = path.join(utilsDir, file);
                const item = new AocTreeItem(
                    file,
                    vscode.TreeItemCollapsibleState.None,
                    'utilityFile',
                    undefined,
                    undefined,
                    filePath
                );

                item.command = {
                    command: 'vscode.open',
                    title: 'Open File',
                    arguments: [vscode.Uri.file(filePath)]
                };

                return item;
            });
        }

        return [];
    }
}
