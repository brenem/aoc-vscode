import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { injectable } from "tsyringe";
import { StatsService } from "../services/stats.service";

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
        
        // Set unique id for tree item matching
        if (contextValue === 'dayFile' && year && dayDir && filePath) {
            this.id = `${year}/${dayDir}/${path.basename(filePath)}`;
        } else if (contextValue === 'day' && year && dayDir) {
            this.id = `${year}/${dayDir}`;
        } else if (contextValue === 'year' && year) {
            this.id = year;
        } else if (contextValue === 'utilityFile' && filePath) {
            this.id = `shared/utils/${path.basename(filePath)}`;
        } else if (contextValue === 'utilsFolder') {
            this.id = 'shared/utils';
        } else if (contextValue === 'shared') {
            this.id = 'shared';
        }
    }
}

@injectable()
export class AocTreeDataProvider implements vscode.TreeDataProvider<AocTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AocTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private workspaceRoot: string;
    private isInitialized = false;

    constructor(private statsService: StatsService) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.log('No workspace open. AoC extension is idle.');
        }
        this.workspaceRoot = workspaceFolders?.[0].uri.fsPath || '';
    }

    get root(): string {
        return this.workspaceRoot;
    }

    async initialize(): Promise<void> {
        // Mark as initialized and trigger initial render
        this.isInitialized = true;
        this._onDidChangeTreeData.fire();
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

    async getChildren(element?: AocTreeItem): Promise<AocTreeItem[] | undefined> {
        // Return undefined when not initialized to prevent welcome message from showing
        if (!this.isInitialized) {
            return undefined;
        }

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
                const dayNum = dayDirName.replace(/^day/, '').padStart(2, '0');
                let label = `Day ${dayNum}`;

                // Add star indicators for solved parts
                const part1Solved = this.statsService.isPartSolved(element.year!, dayNum, 1);
                const part2Solved = this.statsService.isPartSolved(element.year!, dayNum, 2);
                
                if (part1Solved && part2Solved) {
                    label += ' ⭐⭐';
                } else if (part1Solved) {
                    label += ' ⭐';
                }

                // Add stats if available
                if (this.statsService) {
                    const dayStats = this.statsService.getDayStats(element.year!, dayNum);
                    if (dayStats) {
                        const parts: string[] = [];
                        if (dayStats.part1) {
                            parts.push(`P1: ${dayStats.part1.executionTime}ms`);
                        }
                        if (dayStats.part2) {
                            parts.push(`P2: ${dayStats.part2.executionTime}ms`);
                        }
                        if (parts.length > 0) {
                            label += ` • ${parts.join(' | ')}`;
                        }
                    }
                }

                const item = new AocTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'day',
                    element.year!,
                    dayDirName
                );

                // Add tooltip with more details
                if (this.statsService) {
                    const dayStats = this.statsService.getDayStats(element.year!, dayNum);
                    
                    if (dayStats || part1Solved || part2Solved) {
                        const tooltip = new vscode.MarkdownString();
                        tooltip.appendMarkdown(`**Day ${dayNum} Stats**\n\n`);
                        
                        if (dayStats?.part1 || part1Solved) {
                            tooltip.appendMarkdown(`**Part 1** ${part1Solved ? '⭐ Solved' : ''}\n`);
                            if (dayStats?.part1) {
                                tooltip.appendMarkdown(`- Time: ${dayStats.part1.executionTime}ms\n`);
                                tooltip.appendMarkdown(`- Result: ${dayStats.part1.result}\n`);
                                tooltip.appendMarkdown(`- Status: ${dayStats.part1.success ? '✅ Success' : '❌ Error'}\n`);
                            }
                            tooltip.appendMarkdown('\n');
                        }
                        
                        if (dayStats?.part2 || part2Solved) {
                            tooltip.appendMarkdown(`**Part 2** ${part2Solved ? '⭐ Solved' : ''}\n`);
                            if (dayStats?.part2) {
                                tooltip.appendMarkdown(`- Time: ${dayStats.part2.executionTime}ms\n`);
                                tooltip.appendMarkdown(`- Result: ${dayStats.part2.result}\n`);
                                tooltip.appendMarkdown(`- Status: ${dayStats.part2.success ? '✅ Success' : '❌ Error'}\n`);
                            }
                        }
                        
                        item.tooltip = tooltip;
                    }
                }

                // Add command to view puzzle
                item.command = {
                    command: 'aoc.viewPuzzle',
                    title: 'View Puzzle',
                    arguments: [element.year!, dayNum, item]
                };

                return item;
            });
        }

        // Handle day items - show solution.ts, input.txt, and sample.txt
        if (element.contextValue === 'day' && element.year && element.dayDir) {
            const dayDir = path.join(this.workspaceRoot, 'solutions', element.year, element.dayDir);
            const solutionPath = path.join(dayDir, 'solution.ts');
            const inputPath = path.join(dayDir, 'input.txt');
            const samplePath = path.join(dayDir, 'sample.txt');

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
                    arguments: [{ year: element.year, dayDir: element.dayDir }] // Pass only necessary data to avoid circular JSON
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

            // Add sample.txt
            if (fs.existsSync(samplePath)) {
                const sampleItem = new AocTreeItem(
                    'sample.txt',
                    vscode.TreeItemCollapsibleState.None,
                    'dayFile',
                    element.year,
                    element.dayDir,
                    samplePath
                );
                sampleItem.command = {
                    command: 'aoc.openSample',
                    title: 'Open Sample',
                    arguments: [element.year, element.dayDir, samplePath]
                };
                files.push(sampleItem);
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
