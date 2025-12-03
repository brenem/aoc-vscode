import * as vscode from 'vscode';
import { injectable, multiInject } from 'inversify';
import { ICommand } from './types/command';
import { ICommandManager } from './types';

@injectable()
export class CommandManager implements ICommandManager {
    constructor(@multiInject(ICommand) private commands: ICommand[]) {}

    registerCommands(context: vscode.ExtensionContext) {
        for (const c of this.commands) {
            const cmd = vscode.commands.registerCommand(
                c.id,
                (...args: any[]) => c.execute(context, args)
            );
            context.subscriptions.push(cmd);
        }
    }
}

