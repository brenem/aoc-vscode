import * as vscode from 'vscode';
import { injectable } from 'inversify';

@injectable()
export class AocSessionService {
    constructor(private context: vscode.ExtensionContext) {}

    async getSession(): Promise<string | undefined> {
        return await this.context.secrets.get('aoc.sessionToken');
    }

    async setSession(token: string): Promise<void> {
        await this.context.secrets.store('aoc.sessionToken', token);
    }

    async clearSession(): Promise<void> {
        await this.context.secrets.delete('aoc.sessionToken');
    }

    async hasSession(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }
}
