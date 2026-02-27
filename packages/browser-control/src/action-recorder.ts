/**
 * Atlas Browser Action Recorder
 * Records, saves, and replays browser actions as replayable sequences.
 * Inspired by OpenClaw's browser-tool action recording.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'eventemitter3';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionType =
    | 'click'
    | 'type'
    | 'navigate'
    | 'scroll'
    | 'wait'
    | 'keypress'
    | 'screenshot'
    | 'select';

export interface RecordedAction {
    type: ActionType;
    selector?: string;         // CSS selector or ARIA ref
    value?: string;            // text to type, URL to navigate, key to press
    x?: number;                // mouse x (for scroll/click fallback)
    y?: number;                // mouse y
    timestamp: number;         // ms since recording start
    delay?: number;            // ms to wait before action
    description?: string;      // human-readable description
}

export interface ActionRecording {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    actions: RecordedAction[];
    totalDurationMs: number;
    url?: string;              // starting URL
    viewport?: { width: number; height: number };
}

export interface ActionRecorderOptions {
    storageDir: string;        // e.g. ~/.atlas/data/browser-recordings/
}

// ─── ActionRecorder ──────────────────────────────────────────────────────────

export class ActionRecorder extends EventEmitter {
    private storageDir: string;
    private currentRecording: {
        id: string;
        name: string;
        startTime: number;
        actions: RecordedAction[];
        url?: string;
    } | null = null;

    constructor(options: ActionRecorderOptions) {
        super();
        this.storageDir = options.storageDir;
    }

    async initialize(): Promise<void> {
        await fs.mkdir(this.storageDir, { recursive: true });
    }

    // ── Recording ────────────────────────────────────────────────────────────

    startRecording(name: string, startUrl?: string): string {
        const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.currentRecording = {
            id,
            name,
            startTime: Date.now(),
            actions: [],
            url: startUrl,
        };
        this.emit('recordingStarted', { id, name });
        console.log(`🎬 [Recorder] Started recording: ${name} (${id})`);
        return id;
    }

    recordAction(action: Omit<RecordedAction, 'timestamp'>): void {
        if (!this.currentRecording) {
            console.warn('[Recorder] No active recording');
            return;
        }
        const recorded: RecordedAction = {
            ...action,
            timestamp: Date.now() - this.currentRecording.startTime,
        };
        this.currentRecording.actions.push(recorded);
        this.emit('actionRecorded', recorded);
    }

    async stopRecording(description?: string): Promise<ActionRecording | null> {
        if (!this.currentRecording) return null;

        const { id, name, startTime, actions, url } = this.currentRecording;
        const recording: ActionRecording = {
            id,
            name,
            description,
            createdAt: new Date(startTime).toISOString(),
            actions,
            totalDurationMs: Date.now() - startTime,
            url,
        };

        this.currentRecording = null;

        // Auto-save
        await this.saveRecording(recording);
        this.emit('recordingStopped', { id, name, actionCount: actions.length });
        console.log(`🎬 [Recorder] Stopped recording: ${name} (${actions.length} actions)`);
        return recording;
    }

    get isRecording(): boolean {
        return this.currentRecording !== null;
    }

    // ── Persistence ──────────────────────────────────────────────────────────

    async saveRecording(recording: ActionRecording): Promise<string> {
        const filePath = path.join(this.storageDir, `${recording.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(recording, null, 2), 'utf-8');
        console.log(`💾 [Recorder] Saved: ${filePath}`);
        return filePath;
    }

    async loadRecording(id: string): Promise<ActionRecording | null> {
        const filePath = path.join(this.storageDir, `${id}.json`);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as ActionRecording;
        } catch {
            return null;
        }
    }

    async listRecordings(): Promise<Array<{ id: string; name: string; createdAt: string; actionCount: number }>> {
        try {
            const files = await fs.readdir(this.storageDir);
            const recordings: Array<{ id: string; name: string; createdAt: string; actionCount: number }> = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const content = await fs.readFile(path.join(this.storageDir, file), 'utf-8');
                    const rec = JSON.parse(content) as ActionRecording;
                    recordings.push({
                        id: rec.id,
                        name: rec.name,
                        createdAt: rec.createdAt,
                        actionCount: rec.actions.length,
                    });
                } catch {
                    // skip corrupted files
                }
            }

            return recordings.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch {
            return [];
        }
    }

    async deleteRecording(id: string): Promise<boolean> {
        try {
            const filePath = path.join(this.storageDir, `${id}.json`);
            await fs.unlink(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // ── Replay ───────────────────────────────────────────────────────────────

    /**
     * Replay a recording by executing actions sequentially.
     * The actual execution is delegated to the provided executor function.
     * @param id - recording ID
     * @param executor - function that executes each action
     * @param speed - playback speed multiplier (1 = normal, 2 = 2x fast, 0.5 = half speed)
     */
    async replay(
        id: string,
        executor: (action: RecordedAction) => Promise<void>,
        speed: number = 1
    ): Promise<{ ok: boolean; actionsExecuted: number; errors: string[] }> {
        const recording = await this.loadRecording(id);
        if (!recording) {
            return { ok: false, actionsExecuted: 0, errors: [`Recording '${id}' not found`] };
        }

        console.log(`▶️ [Recorder] Replaying: ${recording.name} (${recording.actions.length} actions @ ${speed}x)`);
        this.emit('replayStarted', { id, name: recording.name });

        const errors: string[] = [];
        let executed = 0;
        let lastTimestamp = 0;

        for (const action of recording.actions) {
            // Wait proportional delay between actions
            const delay = (action.timestamp - lastTimestamp) / speed;
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            lastTimestamp = action.timestamp;

            try {
                await executor(action);
                executed++;
                this.emit('actionReplayed', { action, index: executed });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Action ${executed}: ${msg}`);
                console.warn(`[Recorder] Replay error at action ${executed}:`, msg);
            }
        }

        this.emit('replayCompleted', { id, executed, errors: errors.length });
        console.log(`▶️ [Recorder] Replay complete: ${executed}/${recording.actions.length} actions`);
        return { ok: errors.length === 0, actionsExecuted: executed, errors };
    }
}
