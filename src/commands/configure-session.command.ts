import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { ICommand } from '../common/types';
import { AocSessionService } from '../services/aoc-session.service';

@injectable()
export class ConfigureSessionCommand implements ICommand {
    get id(): string {
        return 'aoc.configureSession';
    }

    constructor(private sessionService: AocSessionService) {}

    public async execute(
        context: vscode.ExtensionContext,
        ...args: any[]
    ): Promise<void> {
        const instructions = `To get your Advent of Code session token:

1. Log in to adventofcode.com in your browser
2. Open Developer Tools (F12 or right-click → Inspect)
3. Go to Application tab → Storage → Cookies → adventofcode.com
   (Or Network tab → refresh page → click any request → Headers → Cookie)
4. Find the cookie named 'session' and copy its value
5. Paste the value below (the long alphanumeric string)

Note: Your session token is stored securely and never shared.`;

        const choice = await vscode.window.showInformationMessage(
            'Configure Advent of Code Session',
            'Show Instructions',
            'I Have My Token',
            'Cancel'
        );

        if (choice === 'Show Instructions') {
            await vscode.window.showInformationMessage(instructions, { modal: true });
            // Ask again
            return this.execute(context, ...args);
        }

        if (choice !== 'I Have My Token') {
            return;
        }

        const token = await vscode.window.showInputBox({
            prompt: 'Paste your session token',
            password: true,
            placeHolder: 'Long alphanumeric string from the session cookie',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Session token cannot be empty';
                }
                if (value.length < 50) {
                    return 'Session token seems too short. Please verify.';
                }
                return undefined;
            }
        });

        if (!token) {
            return;
        }

        await this.sessionService.setSession(token.trim());
        vscode.window.showInformationMessage('Advent of Code session configured successfully!');
    }
}
