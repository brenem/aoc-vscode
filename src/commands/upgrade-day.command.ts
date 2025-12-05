import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { ICommand } from '../common/types';
import { AocTreeDataProvider, AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class UpgradeDayCommand implements ICommand {
    get id(): string {
        return 'aoc.upgradeDay';
    }

    constructor(private aocProvider: AocTreeDataProvider) {}

    public async execute(
        context: vscode.ExtensionContext,
        ...args: any[]
    ): Promise<void> {
        const root = this.aocProvider.root;

        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first.');
            return;
        }

        const treeItem = args[0] as AocTreeItem | undefined;
        
        // If called from tree item context, upgrade single day or year
        if (treeItem) {
            if (treeItem.contextValue === 'day' && treeItem.year && treeItem.dayDir) {
                await this.upgradeSingleDay(context, root, treeItem.year, treeItem.dayDir);
            } else if (treeItem.contextValue === 'year' && treeItem.year) {
                await this.upgradeYear(context, root, treeItem.year);
            }
        } else {
            // Called from command palette - upgrade all
            await this.upgradeAll(context, root);
        }

        this.aocProvider.refresh();
    }

    private async upgradeSingleDay(
        context: vscode.ExtensionContext,
        root: string,
        year: string,
        dayDir: string
    ): Promise<void> {
        const dayPath = path.join(root, 'solutions', year, dayDir);
        
        if (!fs.existsSync(dayPath)) {
            vscode.window.showErrorMessage(`Day folder not found: ${dayPath}`);
            return;
        }

        const filesAdded = this.addMissingFiles(context, dayPath);
        
        if (filesAdded.length > 0) {
            vscode.window.showInformationMessage(
                `✅ Upgraded ${year} ${dayDir}: Added ${filesAdded.join(', ')}`
            );
        } else {
            vscode.window.showInformationMessage(
                `✓ ${year} ${dayDir} already has all files`
            );
        }
    }

    private async upgradeYear(
        context: vscode.ExtensionContext,
        root: string,
        year: string
    ): Promise<void> {
        const yearPath = path.join(root, 'solutions', year);
        
        if (!fs.existsSync(yearPath)) {
            vscode.window.showErrorMessage(`Year folder not found: ${yearPath}`);
            return;
        }

        let totalAdded = 0;
        let daysUpgraded = 0;

        const entries = fs.readdirSync(yearPath, { withFileTypes: true });
        const dayDirs = entries
            .filter(e => e.isDirectory() && e.name.match(/^day\d{2}$/))
            .map(e => e.name);

        for (const dayDir of dayDirs) {
            const dayPath = path.join(yearPath, dayDir);
            const filesAdded = this.addMissingFiles(context, dayPath);
            if (filesAdded.length > 0) {
                totalAdded += filesAdded.length;
                daysUpgraded++;
            }
        }

        if (totalAdded > 0) {
            vscode.window.showInformationMessage(
                `✅ Upgraded ${daysUpgraded} day(s) in ${year}: Added ${totalAdded} file(s)`
            );
        } else {
            vscode.window.showInformationMessage(
                `✓ All days in ${year} already up to date`
            );
        }
    }

    private async upgradeAll(
        context: vscode.ExtensionContext,
        root: string
    ): Promise<void> {
        const solutionsPath = path.join(root, 'solutions');
        
        if (!fs.existsSync(solutionsPath)) {
            vscode.window.showErrorMessage('No solutions folder found.');
            return;
        }

        let totalAdded = 0;
        let daysUpgraded = 0;
        let yearsProcessed = 0;

        const entries = fs.readdirSync(solutionsPath, { withFileTypes: true });
        const years = entries
            .filter(e => e.isDirectory() && e.name.match(/^\d{4}$/))
            .map(e => e.name);

        for (const year of years) {
            const yearPath = path.join(solutionsPath, year);
            const dayEntries = fs.readdirSync(yearPath, { withFileTypes: true });
            const dayDirs = dayEntries
                .filter(e => e.isDirectory() && e.name.match(/^day\d{2}$/))
                .map(e => e.name);

            for (const dayDir of dayDirs) {
                const dayPath = path.join(yearPath, dayDir);
                const filesAdded = this.addMissingFiles(context, dayPath);
                if (filesAdded.length > 0) {
                    totalAdded += filesAdded.length;
                    daysUpgraded++;
                }
            }

            if (dayDirs.length > 0) {
                yearsProcessed++;
            }
        }

        if (totalAdded > 0) {
            vscode.window.showInformationMessage(
                `✅ Upgraded ${daysUpgraded} day(s) across ${yearsProcessed} year(s): Added ${totalAdded} file(s)`
            );
        } else {
            vscode.window.showInformationMessage(
                `✓ All days are already up to date`
            );
        }
    }

    private addMissingFiles(context: vscode.ExtensionContext, dayPath: string): string[] {
        const filesAdded: string[] = [];

        // Add sample.txt if missing
        const samplePath = path.join(dayPath, 'sample.txt');
        if (!fs.existsSync(samplePath)) {
            fs.writeFileSync(samplePath, '', 'utf-8');
            filesAdded.push('sample.txt');
        }

        return filesAdded;
    }
}
