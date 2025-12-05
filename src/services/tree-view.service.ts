import * as vscode from 'vscode';
import { AocTreeItem } from '../providers/aoc-tree-data-provider';
import { injectable } from 'tsyringe';

@injectable()
export class TreeViewService {
    private treeView?: vscode.TreeView<AocTreeItem>;

    setTreeView(treeView: vscode.TreeView<AocTreeItem>): void {
        this.treeView = treeView;
    }

    async reveal(item: AocTreeItem, options?: { select?: boolean; focus?: boolean; expand?: boolean | number }): Promise<void> {
        if (this.treeView) {
            await this.treeView.reveal(item, options);
        }
    }
}
