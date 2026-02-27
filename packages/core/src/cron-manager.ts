
import { Cron } from 'croner';
import { EventEmitter } from 'eventemitter3';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CronTask {
    id: string;
    pattern: string;            // cron expression or ISO date for one-shot
    handler: () => Promise<void>;
    name?: string;
    lastRun?: Date;
    nextRun?: Date;
    timezone?: string;
    enabled: boolean;
    oneShot: boolean;           // true = run once then auto-delete
    webhookUrl?: string;        // POST here on completion
    createdAt: Date;
}

export interface CronRunRecord {
    jobId: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    status: 'success' | 'error';
    error?: string;
}

export interface CronJobConfig {
    id: string;
    pattern: string;
    name?: string;
    timezone?: string;
    enabled: boolean;
    oneShot: boolean;
    webhookUrl?: string;
    createdAt: string;
}

export interface CronManagerOptions {
    persistPath?: string;       // path to cron-jobs.json
    maxRunHistory?: number;     // per job, default 50
}

// ─── CronManager ─────────────────────────────────────────────────────────────

export class CronManager extends EventEmitter {
    private tasks: Map<string, { job: Cron; task: CronTask }> = new Map();
    private runHistory: Map<string, CronRunRecord[]> = new Map();
    private persistPath: string | null;
    private maxRunHistory: number;

    constructor(options?: CronManagerOptions) {
        super();
        this.persistPath = options?.persistPath || null;
        this.maxRunHistory = options?.maxRunHistory || 50;
    }

    // ── Persistence ──────────────────────────────────────────────────────────

    /**
     * Save current job configs (not handlers) to disk
     */
    async persist(): Promise<void> {
        if (!this.persistPath) return;
        const jobs: CronJobConfig[] = Array.from(this.tasks.values()).map(e => ({
            id: e.task.id,
            pattern: e.task.pattern,
            name: e.task.name,
            timezone: e.task.timezone,
            enabled: e.task.enabled,
            oneShot: e.task.oneShot,
            webhookUrl: e.task.webhookUrl,
            createdAt: e.task.createdAt.toISOString(),
        }));
        try {
            await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
            await fs.writeFile(this.persistPath, JSON.stringify(jobs, null, 2), 'utf-8');
        } catch (err) {
            console.error('[Cron] Failed to persist jobs:', err);
        }
    }

    /**
     * Load saved job configs (caller must re-attach handlers)
     */
    async loadPersistedJobs(): Promise<CronJobConfig[]> {
        if (!this.persistPath) return [];
        try {
            const content = await fs.readFile(this.persistPath, 'utf-8');
            return JSON.parse(content) as CronJobConfig[];
        } catch {
            return [];
        }
    }

    // ── Core scheduling ──────────────────────────────────────────────────────

    /**
     * Schedule a recurring cron job
     */
    schedule(
        id: string,
        pattern: string,
        handler: () => Promise<void>,
        name?: string,
        timezone?: string,
        options?: { webhookUrl?: string; enabled?: boolean }
    ): void {
        if (this.tasks.has(id)) {
            console.warn(`[Cron] Task ${id} already exists, replacing...`);
            this.stop(id);
        }

        const enabled = options?.enabled !== false;

        const wrappedHandler = async () => {
            const start = Date.now();
            let status: 'success' | 'error' = 'success';
            let error: string | undefined;
            try {
                this.emit('taskStarted', id);
                const entry = this.tasks.get(id);
                if (entry) {
                    entry.task.lastRun = new Date();
                    entry.task.nextRun = entry.job.nextRun() || undefined;
                }
                await handler();
                this.emit('taskCompleted', id);
                console.log(`[Cron] ✅ Executed: ${name || id}`);
            } catch (err) {
                status = 'error';
                error = err instanceof Error ? err.message : String(err);
                console.error(`[Cron] ❌ Task ${id} failed:`, err);
                this.emit('error', { id, error: err });
            }

            // Record run history
            const record: CronRunRecord = {
                jobId: id,
                startedAt: new Date(start).toISOString(),
                completedAt: new Date().toISOString(),
                durationMs: Date.now() - start,
                status,
                error,
            };
            this.addRunRecord(id, record);

            // Webhook delivery
            const task = this.tasks.get(id)?.task;
            if (task?.webhookUrl) {
                this.fireWebhook(task.webhookUrl, { ...record, name: task.name });
            }
        };

        const job = new Cron(pattern, {
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            paused: !enabled,
            catch: (err) => {
                console.error(`[Cron] Error in task ${id}:`, err);
                this.emit('error', { id, error: err });
            }
        }, wrappedHandler);

        const task: CronTask = {
            id, pattern, handler, name, timezone,
            enabled,
            oneShot: false,
            webhookUrl: options?.webhookUrl,
            nextRun: job.nextRun() || undefined,
            createdAt: new Date(),
        };

        this.tasks.set(id, { job, task });
        console.log(`[Cron] 📅 Scheduled: ${name || id} (${pattern})`);
        void this.persist();
    }

    /**
     * Schedule a one-shot job that runs at a specific date/time and auto-deletes
     */
    scheduleOnce(
        id: string,
        runAt: Date | string,
        handler: () => Promise<void>,
        name?: string,
        options?: { webhookUrl?: string }
    ): void {
        if (this.tasks.has(id)) {
            console.warn(`[Cron] Task ${id} already exists, replacing...`);
            this.stop(id);
        }

        const targetDate = typeof runAt === 'string' ? new Date(runAt) : runAt;
        if (targetDate.getTime() <= Date.now()) {
            console.warn(`[Cron] One-shot ${id} target is in the past, running immediately`);
        }

        const wrappedHandler = async () => {
            const start = Date.now();
            let status: 'success' | 'error' = 'success';
            let error: string | undefined;
            try {
                this.emit('taskStarted', id);
                await handler();
                this.emit('taskCompleted', id);
                console.log(`[Cron] ✅ One-shot executed: ${name || id}`);
            } catch (err) {
                status = 'error';
                error = err instanceof Error ? err.message : String(err);
                console.error(`[Cron] ❌ One-shot ${id} failed:`, err);
                this.emit('error', { id, error: err });
            }

            const record: CronRunRecord = {
                jobId: id,
                startedAt: new Date(start).toISOString(),
                completedAt: new Date().toISOString(),
                durationMs: Date.now() - start,
                status,
                error,
            };
            this.addRunRecord(id, record);

            const task = this.tasks.get(id)?.task;
            if (task?.webhookUrl) {
                this.fireWebhook(task.webhookUrl, { ...record, name: task.name });
            }

            // Auto-delete after execution
            this.stop(id);
            console.log(`[Cron] 🗑️ One-shot ${name || id} auto-removed`);
        };

        const job = new Cron(targetDate, {
            catch: (err) => {
                console.error(`[Cron] Error in one-shot ${id}:`, err);
                this.emit('error', { id, error: err });
            }
        }, wrappedHandler);

        const task: CronTask = {
            id, pattern: targetDate.toISOString(), handler, name,
            enabled: true,
            oneShot: true,
            webhookUrl: options?.webhookUrl,
            nextRun: targetDate,
            createdAt: new Date(),
        };

        this.tasks.set(id, { job, task });
        console.log(`[Cron] ⏱️ One-shot scheduled: ${name || id} at ${targetDate.toISOString()}`);
        void this.persist();
    }

    // ── Pause / Resume ───────────────────────────────────────────────────────

    /**
     * Pause a job without removing it
     */
    pause(id: string): boolean {
        const entry = this.tasks.get(id);
        if (!entry) return false;
        entry.job.pause();
        entry.task.enabled = false;
        console.log(`[Cron] ⏸️ Paused: ${entry.task.name || id}`);
        this.emit('taskPaused', id);
        void this.persist();
        return true;
    }

    /**
     * Resume a paused job
     */
    resume(id: string): boolean {
        const entry = this.tasks.get(id);
        if (!entry) return false;
        entry.job.resume();
        entry.task.enabled = true;
        entry.task.nextRun = entry.job.nextRun() || undefined;
        console.log(`[Cron] ▶️ Resumed: ${entry.task.name || id}`);
        this.emit('taskResumed', id);
        void this.persist();
        return true;
    }

    // ── Run history ──────────────────────────────────────────────────────────

    private addRunRecord(jobId: string, record: CronRunRecord): void {
        let history = this.runHistory.get(jobId);
        if (!history) {
            history = [];
            this.runHistory.set(jobId, history);
        }
        history.unshift(record);
        if (history.length > this.maxRunHistory) {
            history.length = this.maxRunHistory;
        }
    }

    /**
     * Get run history for a specific job
     */
    getRunHistory(jobId: string): CronRunRecord[] {
        return this.runHistory.get(jobId) || [];
    }

    // ── Trigger ──────────────────────────────────────────────────────────────

    /**
     * Trigger a job to run immediately (outside its schedule)
     */
    async triggerNow(id: string): Promise<boolean> {
        const entry = this.tasks.get(id);
        if (!entry) return false;
        console.log(`[Cron] 🚀 Force triggering: ${entry.task.name || id}`);
        try {
            await entry.task.handler();
            this.emit('taskCompleted', id);
        } catch (err) {
            this.emit('error', { id, error: err });
        }
        return true;
    }

    // ── Webhook ──────────────────────────────────────────────────────────────

    private async fireWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10_000),
            });
            if (!response.ok) {
                console.warn(`[Cron] Webhook ${url} returned ${response.status}`);
            }
        } catch (err) {
            console.warn(`[Cron] Webhook delivery failed for ${url}:`, err);
        }
    }

    // ── Stop / Status ────────────────────────────────────────────────────────

    /**
     * Stop and remove a task
     */
    stop(id: string): void {
        const entry = this.tasks.get(id);
        if (entry) {
            entry.job.stop();
            this.tasks.delete(id);
            console.log(`[Cron] Stopped: ${id}`);
            void this.persist();
        }
    }

    /**
     * Stop all tasks
     */
    stopAll(): void {
        for (const [, entry] of this.tasks.entries()) {
            entry.job.stop();
        }
        this.tasks.clear();
        console.log('[Cron] All tasks stopped');
        void this.persist();
    }

    /**
     * Get all tasks status
     */
    getTasksStatus(): Array<{
        id: string;
        name?: string;
        pattern: string;
        nextRun: Date | null;
        lastRun?: Date;
        enabled: boolean;
        oneShot: boolean;
        webhookUrl?: string;
        runCount: number;
    }> {
        return Array.from(this.tasks.values()).map(e => ({
            id: e.task.id,
            name: e.task.name,
            pattern: e.task.pattern,
            nextRun: e.job.nextRun(),
            lastRun: e.task.lastRun,
            enabled: e.task.enabled,
            oneShot: e.task.oneShot,
            webhookUrl: e.task.webhookUrl,
            runCount: this.runHistory.get(e.task.id)?.length || 0,
        }));
    }

    /**
     * Check if a job exists
     */
    has(id: string): boolean {
        return this.tasks.has(id);
    }

    /**
     * Get count of active (enabled) jobs
     */
    get activeCount(): number {
        return Array.from(this.tasks.values()).filter(e => e.task.enabled).length;
    }

    /**
     * Get total job count
     */
    get totalCount(): number {
        return this.tasks.size;
    }
}
