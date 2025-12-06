import * as vscode from 'vscode';
import { injectable, inject } from 'tsyringe';
import { ExtensionContext } from '../common/types';
import { AocApiService, SubmissionResult } from './aoc-api.service';
import { AocSessionService } from './aoc-session.service';

interface WaitState {
    timestamp: number; // When the wait started
    duration: number;  // How long to wait in seconds
}

@injectable()
export class SubmissionService {
    private static readonly STORAGE_KEY = 'aoc.waitState';
    private waitState: WaitState | undefined;
    private timer: NodeJS.Timeout | undefined;
    private statusBarItem: vscode.StatusBarItem;

    constructor(
        @inject(ExtensionContext) private context: vscode.ExtensionContext,
        private apiService: AocApiService,
        private sessionService: AocSessionService
    ) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.loadWaitState();
        this.startTimer();
    }

    private loadWaitState() {
        this.waitState = this.context.globalState.get<WaitState>(SubmissionService.STORAGE_KEY);
    }

    private saveWaitState(state: WaitState | undefined) {
        this.waitState = state;
        this.context.globalState.update(SubmissionService.STORAGE_KEY, state);
    }

    private startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        // Update UI every second
        this.timer = setInterval(() => {
            this.updateStatusBar();
        }, 1000);
        
        // Initial update
        this.updateStatusBar();
    }

    private updateStatusBar() {
        const remaining = this.getWaitTimeRemaining();
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            this.statusBarItem.text = `$(watch) AoC Cooldown: ${minutes}m ${seconds}s`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
            // If we had a wait state but time is up, clear it
            if (this.waitState) {
                this.saveWaitState(undefined);
            }
        }
    }

    public getWaitTimeRemaining(): number {
        if (!this.waitState) {
            return 0;
        }
        
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - this.waitState.timestamp) / 1000);
        const remaining = this.waitState.duration - elapsedSeconds;
        
        return Math.max(0, remaining);
    }

    public canSubmit(): boolean {
        return this.getWaitTimeRemaining() === 0;
    }

    public async submit(year: string, day: string, part: '1' | '2', answer: string): Promise<SubmissionResult> {
        if (!this.canSubmit()) {
            const remaining = this.getWaitTimeRemaining();
            throw new Error(`Please wait ${remaining} seconds before submitting again.`);
        }

        const session = await this.sessionService.getSession();
        if (!session) {
            throw new Error('No session token found. Please configure it first.');
        }

        const result = await this.apiService.submitSolution(year, day, part, answer, session);

        if (result.status === 'INCORRECT' || result.status === 'WAIT') {
             if (result.waitTime) {
                 this.saveWaitState({
                     timestamp: Date.now(),
                     duration: result.waitTime
                 });
                 this.updateStatusBar();
             }
        } else if (result.status === 'CORRECT') {
            // Clear any potential wait state (though logic implies it shouldn't exist if we submitted)
            this.saveWaitState(undefined);
        }

        return result;
    }
}
