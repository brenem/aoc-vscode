import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { injectable } from "inversify";

export class AocTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: 'year' | 'day',
        public readonly year?: string,
        public readonly dayDir?: string,
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

    async getChildren(element?: AocTreeItem): Promise<AocTreeItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('Open a workspace to use AoC Explorer');
            return [];
        }

        if (!element) {
            const solutionsRoot = path.join(this.workspaceRoot, 'solutions');

            // auto-create solutions directory if missing
            if (!fs.existsSync(solutionsRoot)) {
                fs.mkdirSync(solutionsRoot, { recursive: true });
            }

            const years = fs
                .readdirSync(solutionsRoot, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .sort();

            return years.map(year => new AocTreeItem(
                year,
                vscode.TreeItemCollapsibleState.Collapsed,
                'year',
                year,
                undefined
            ));
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
                const solutionPath = path.join(yearDir, dayDirName, 'solution.ts');
                const isSolved = fs.existsSync(solutionPath); // placeholder for "status"

                const item = new AocTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    'day',
                    element.year!,
                    dayDirName
                );

                item.command = {
                    command: 'aoc.openDay',
                    title: 'Open Day',
                    arguments: [item]
                };

                item.description = isSolved ? 'Solved' : 'missing';
                return item;
            });
        }

        return [];
    }
}
