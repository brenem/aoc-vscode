import * as vscode from 'vscode';
import { injectable } from 'tsyringe';

@injectable()
export class BreakpointSyncService {
    private fileMapping = new Map<string, string>(); // virtual URI → real path
    private reverseMapping = new Map<string, string>(); // real path → virtual URI
    private isSyncing = false; // Prevent infinite loops
    private disposables: vscode.Disposable[] = [];

    public initialize(context: vscode.ExtensionContext): void {
        // Listen to breakpoint changes
        const listener = vscode.debug.onDidChangeBreakpoints(this.handleBreakpointChange.bind(this));
        this.disposables.push(listener);
        context.subscriptions.push(listener);
    }

    public registerFileMapping(virtualUri: vscode.Uri, realPath: string): void {
        const virtualUriString = virtualUri.toString();
        this.fileMapping.set(virtualUriString, realPath);
        this.reverseMapping.set(realPath, virtualUriString);
    }

    public unregisterFileMapping(virtualUri: vscode.Uri): void {
        const virtualUriString = virtualUri.toString();
        const realPath = this.fileMapping.get(virtualUriString);
        if (realPath) {
            this.reverseMapping.delete(realPath);
        }
        this.fileMapping.delete(virtualUriString);
    }

    private handleBreakpointChange(event: vscode.BreakpointsChangeEvent): void {
        if (this.isSyncing) {
            return; // Prevent infinite loops
        }

        try {
            this.isSyncing = true;

            // Handle added breakpoints
            for (const bp of event.added) {
                if (bp instanceof vscode.SourceBreakpoint) {
                    this.syncBreakpoint(bp, 'add');
                }
            }

            // Handle removed breakpoints
            for (const bp of event.removed) {
                if (bp instanceof vscode.SourceBreakpoint) {
                    this.syncBreakpoint(bp, 'remove');
                }
            }

            // Handle changed breakpoints
            for (const bp of event.changed) {
                if (bp instanceof vscode.SourceBreakpoint) {
                    this.syncBreakpoint(bp, 'change');
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private syncBreakpoint(bp: vscode.SourceBreakpoint, action: 'add' | 'remove' | 'change'): void {
        const sourceUri = bp.location.uri.toString();
        
        // Check if this is a virtual file
        const realPath = this.fileMapping.get(sourceUri);
        if (realPath) {
            // Virtual → Real sync
            this.syncToFile(bp, vscode.Uri.file(realPath), action);
            return;
        }

        // Check if this is a real file
        const virtualUri = this.reverseMapping.get(sourceUri);
        if (virtualUri) {
            // Real → Virtual sync
            this.syncToFile(bp, vscode.Uri.parse(virtualUri), action);
            return;
        }
    }

    private syncToFile(sourceBp: vscode.SourceBreakpoint, targetUri: vscode.Uri, action: 'add' | 'remove' | 'change'): void {
        if (action === 'remove') {
            // Find and remove corresponding breakpoint in target file
            const targetBreakpoints = vscode.debug.breakpoints.filter(
                bp => bp instanceof vscode.SourceBreakpoint &&
                      bp.location.uri.toString() === targetUri.toString() &&
                      bp.location.range.start.line === sourceBp.location.range.start.line
            ) as vscode.SourceBreakpoint[];

            if (targetBreakpoints.length > 0) {
                vscode.debug.removeBreakpoints(targetBreakpoints);
            }
        } else {
            // Add or change: remove existing and add new
            const targetBreakpoints = vscode.debug.breakpoints.filter(
                bp => bp instanceof vscode.SourceBreakpoint &&
                      bp.location.uri.toString() === targetUri.toString() &&
                      bp.location.range.start.line === sourceBp.location.range.start.line
            ) as vscode.SourceBreakpoint[];

            if (targetBreakpoints.length > 0) {
                vscode.debug.removeBreakpoints(targetBreakpoints);
            }

            // Add new breakpoint with same properties
            const newBp = new vscode.SourceBreakpoint(
                new vscode.Location(targetUri, sourceBp.location.range),
                sourceBp.enabled,
                sourceBp.condition,
                sourceBp.hitCondition,
                sourceBp.logMessage
            );
            vscode.debug.addBreakpoints([newBp]);
        }
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
