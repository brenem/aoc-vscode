import * as vscode from 'vscode';
import { injectable, inject } from 'tsyringe';
import { ExtensionContext } from '../common/types';

export interface PartStats {
    result: string | number;
    executionTime: number; // milliseconds
    timestamp: number;
    success: boolean;
    solved?: boolean; // Whether this part was successfully submitted to AoC
}

export interface DayStats {
    part1?: PartStats;
    part2?: PartStats;
}

@injectable()
export class StatsService {
    private static readonly STORAGE_KEY = 'aoc.stats';
    private stats: Map<string, DayStats> = new Map();

    constructor(@inject(ExtensionContext) private context: vscode.ExtensionContext) {
        this.loadStats();
    }

    private getKey(year: string, day: string): string {
        // Normalize day to always use zero-padding (e.g., "2" -> "02")
        const paddedDay = day.padStart(2, '0');
        return `${year}-${paddedDay}`;
    }

    public savePartStats(year: string, day: string, part: 1 | 2, stats: PartStats): void {
        const key = this.getKey(year, day);
        let dayStats = this.stats.get(key) || {};

        if (part === 1) {
            dayStats.part1 = stats;
        } else {
            dayStats.part2 = stats;
        }

        this.stats.set(key, dayStats);
        this.persistStats();
    }

    public getDayStats(year: string, day: string): DayStats | undefined {
        return this.stats.get(this.getKey(year, day));
    }

    public getPartStats(year: string, day: string, part: 1 | 2): PartStats | undefined {
        const dayStats = this.getDayStats(year, day);
        return part === 1 ? dayStats?.part1 : dayStats?.part2;
    }

    public markPartSolved(year: string, day: string, part: 1 | 2): void {
        const key = this.getKey(year, day);
        let dayStats = this.stats.get(key) || {};

        // Get existing part stats or create new one
        const partStats = part === 1 ? dayStats.part1 : dayStats.part2;
        if (partStats) {
            partStats.solved = true;
        } else {
            // Create minimal stats if they don't exist
            const newStats: PartStats = {
                result: '',
                executionTime: 0,
                timestamp: Date.now(),
                success: true,
                solved: true
            };
            if (part === 1) {
                dayStats.part1 = newStats;
            } else {
                dayStats.part2 = newStats;
            }
        }

        this.stats.set(key, dayStats);
        this.persistStats();
    }

    public isPartSolved(year: string, day: string, part: 1 | 2): boolean {
        const partStats = this.getPartStats(year, day, part);
        return partStats?.solved === true;
    }

    public isDaySolved(year: string, day: string): boolean {
        const dayStats = this.getDayStats(year, day);
        return dayStats?.part1?.solved === true && dayStats?.part2?.solved === true;
    }

    private loadStats(): void {
        const stored = this.context.workspaceState.get<Record<string, DayStats>>(StatsService.STORAGE_KEY);
        if (stored) {
            // Migrate old keys to new normalized format
            const migratedEntries = new Map<string, DayStats>();
            
            for (const [key, value] of Object.entries(stored)) {
                // Parse the key (format: "year-day")
                const parts = key.split('-');
                if (parts.length === 2) {
                    const year = parts[0];
                    const day = parts[1];
                    // Use getKey to normalize the format
                    const normalizedKey = this.getKey(year, day);
                    
                    // If we already have data for this normalized key, merge them
                    const existing = migratedEntries.get(normalizedKey);
                    if (existing) {
                        // Merge properties within each PartStats object
                        migratedEntries.set(normalizedKey, {
                            part1: existing.part1 || value.part1 ? {
                                ...(existing.part1 || {}),
                                ...(value.part1 || {})
                            } as PartStats : undefined,
                            part2: existing.part2 || value.part2 ? {
                                ...(existing.part2 || {}),
                                ...(value.part2 || {})
                            } as PartStats : undefined
                        });
                    } else {
                        migratedEntries.set(normalizedKey, value);
                    }
                } else {
                    // Invalid key format, skip
                    continue;
                }
            }
            
            this.stats = migratedEntries;
            // Persist the migrated data
            this.persistStats();
        }
    }

    private persistStats(): void {
        const obj = Object.fromEntries(this.stats.entries());
        this.context.workspaceState.update(StatsService.STORAGE_KEY, obj);
    }
}
