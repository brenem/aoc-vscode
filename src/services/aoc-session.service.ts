import * as vscode from 'vscode';
import { injectable, inject } from 'tsyringe';

@injectable()
export class AocSessionService {
    constructor(@inject('ExtensionContext') private context: vscode.ExtensionContext) {}

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
