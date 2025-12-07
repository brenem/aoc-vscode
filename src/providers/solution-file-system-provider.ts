import * as vscode from 'vscode';
import * as fs from 'fs';
import { injectable, inject } from 'tsyringe';
import { BreakpointSyncService } from '../services/breakpoint-sync.service';

@injectable()
export class SolutionFileSystemProvider implements vscode.FileSystemProvider {
    private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

    constructor(private breakpointSyncService: BreakpointSyncService) {}

    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        const realPath = this.getRealPath(uri);
        // Simple watch implementation using fs.watch
        // Note: fs.watch is not always reliable on all platforms/file systems, but sufficient for this use case
        const watcher = fs.watch(realPath, (event, filename) => {
             this._onDidChangeFile.fire([{
                type: vscode.FileChangeType.Changed,
                uri: uri
            }]);
        });
        return { dispose: () => watcher.close() };
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const realPath = this.getRealPath(uri);
        const stats = fs.statSync(realPath);
        return {
            type: stats.isFile() ? vscode.FileType.File : vscode.FileType.Directory,
            ctime: stats.ctimeMs,
            mtime: stats.mtimeMs,
            size: stats.size
        };
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const realPath = this.getRealPath(uri);
        // Register the mapping for breakpoint synchronization
        this.breakpointSyncService.registerFileMapping(uri, realPath);
        return fs.readFileSync(realPath);
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void {
        const realPath = this.getRealPath(uri);
        fs.writeFileSync(realPath, content);
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        throw new Error('Method not implemented.');
    }

    createDirectory(uri: vscode.Uri): void {
        throw new Error('Method not implemented.');
    }

    delete(uri: vscode.Uri, options: { recursive: boolean; }): void {
        const realPath = this.getRealPath(uri);
        fs.unlinkSync(realPath);
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void {
        throw new Error('Method not implemented.');
    }

    private getRealPath(uri: vscode.Uri): string {
        const query = new URLSearchParams(uri.query);
        return query.get('realPath') || '';
    }
}
