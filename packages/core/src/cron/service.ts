import { EventEmitter } from 'eventemitter3';
import { resolveNextRun } from './schedule.js';
import { readCronStore, upsertJob, deleteJob } from './store.js';
import { CronJob, CronJobCreate, CronJobPatch } from './types.js';

export interface CronServiceOptions {
    storePath: string;
    enabled?: boolean;
}

export class CronService extends EventEmitter {
    private timer: NodeJS.Timeout | null = null;
    private isRunning = false;
    private jobs: CronJob[] = [];

    constructor(private opts: CronServiceOptions) {
        super();
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Load existing jobs
        const store = await readCronStore(this.opts.storePath);
        this.jobs = store.jobs;

        console.log(`[CronService] Started with ${this.jobs.length} loaded jobs.`);
        this.tick();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('[CronService] Stopped.');
    }

    private async tick() {
        if (!this.isRunning) return;

        const nowMs = Date.now();
        let nextWakeupMs = nowMs + 60000; // Default sleep 1 minute

        for (const job of this.jobs) {
            if (!job.enabled) continue;

            try {
                // If we missed a run or are due
                if (job.state.nextRunAtMs && job.state.nextRunAtMs <= nowMs) {
                    // Execute!
                    this.emit('run', job);

                    job.state.lastRunAtMs = nowMs;
                    job.state.lastRunStatus = 'ok';

                    // Compute next
                    const next = resolveNextRun(job.schedule, nowMs);
                    if (next) {
                        job.state.nextRunAtMs = next;
                    } else {
                        // One-shot at/cron exhausted
                        job.enabled = false;
                        if (job.deleteAfterRun) {
                            await this.remove(job.id);
                            continue; // Skip upsert below since removed
                        }
                    }
                    await upsertJob(this.opts.storePath, job);
                }

                // Track next wakeup
                if (job.state.nextRunAtMs && job.state.nextRunAtMs > nowMs) {
                    nextWakeupMs = Math.min(nextWakeupMs, job.state.nextRunAtMs);
                } else if (!job.state.nextRunAtMs) {
                    // Fresh job, compute initial schedule
                    const next = resolveNextRun(job.schedule, nowMs);
                    if (next) {
                        job.state.nextRunAtMs = next;
                        await upsertJob(this.opts.storePath, job);
                        nextWakeupMs = Math.min(nextWakeupMs, next);
                    }
                }
            } catch (err) {
                console.error(`[CronService] Error evaluating job ${job.id}`, err);
            }
        }

        const sleepMs = Math.max(1000, nextWakeupMs - Date.now());
        this.timer = setTimeout(() => this.tick(), sleepMs);
    }

    async list() {
        const store = await readCronStore(this.opts.storePath);
        return store.jobs;
    }

    async add(input: CronJobCreate): Promise<CronJob> {
        const job: CronJob = {
            createdAtMs: Date.now(),
            updatedAtMs: Date.now(),
            state: input.state || {},
            ...input,
            id: input.id || crypto.randomUUID()
        };

        await upsertJob(this.opts.storePath, job);
        this.jobs.push(job);

        // Interrupt current tick sleep to re-evaluate schedules immediately
        if (this.isRunning) {
            if (this.timer) clearTimeout(this.timer);
            this.tick();
        }

        return job;
    }

    async update(id: string, patch: CronJobPatch): Promise<CronJob | null> {
        const store = await readCronStore(this.opts.storePath);
        const existing = store.jobs.find(j => j.id === id);
        if (!existing) return null;

        Object.assign(existing, patch);
        if (patch.payload) Object.assign(existing.payload, patch.payload);
        if (patch.state) Object.assign(existing.state, patch.state);

        const updated = await upsertJob(this.opts.storePath, existing);
        this.jobs = store.jobs; // refresh RAM cache

        if (this.isRunning) {
            if (this.timer) clearTimeout(this.timer);
            this.tick();
        }
        return updated;
    }

    async remove(id: string) {
        await deleteJob(this.opts.storePath, id);
        this.jobs = this.jobs.filter(j => j.id !== id);
    }
}
