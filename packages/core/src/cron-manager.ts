
import { Cron } from 'croner';
import { EventEmitter } from 'eventemitter3';

export interface CronTask {
    id: string;
    pattern: string;
    handler: () => Promise<void>;
    name?: string;
    lastRun?: Date;
    nextRun?: Date;
    timezone?: string;
}

export class CronManager extends EventEmitter {
    private tasks: Map<string, { job: Cron; task: CronTask }> = new Map();

    constructor() {
        super();
    }

    /**
     * Schedule a new task
     */
    schedule(id: string, pattern: string, handler: () => Promise<void>, name?: string, timezone?: string): void {
        if (this.tasks.has(id)) {
            console.warn(`[Cron] Task ${id} already exists, replacing...`);
            this.stop(id);
        }

        const job = new Cron(pattern, {
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            catch: (err) => {
                console.error(`[Cron] Error in task ${id}:`, err);
                this.emit('error', { id, error: err });
            }
        }, async () => {
            try {
                this.emit('taskStarted', id);
                await handler();
                this.emit('taskCompleted', id);
                console.log(`[Cron] Executed task: ${name || id}`);
            } catch (error) {
                console.error(`[Cron] Task ${id} execution failed:`, error);
                this.emit('error', { id, error });
            }
        });

        this.tasks.set(id, {
            job,
            task: { id, pattern, handler, name, timezone }
        });

        console.log(`[Cron] Scheduled task: ${name || id} (${pattern})`);
    }

    /**
     * Stop a task
     */
    stop(id: string): void {
        const entry = this.tasks.get(id);
        if (entry) {
            entry.job.stop();
            this.tasks.delete(id);
            console.log(`[Cron] Stopped task: ${id}`);
        }
    }

    /**
     * Stop all tasks
     */
    stopAll(): void {
        for (const [id, entry] of this.tasks.entries()) {
            entry.job.stop();
        }
        this.tasks.clear();
        console.log('[Cron] All tasks stopped');
    }

    /**
     * Get all tasks status
     */
    getTasksStatus(): any[] {
        return Array.from(this.tasks.values()).map(e => ({
            id: e.task.id,
            name: e.task.name,
            pattern: e.task.pattern,
            nextRun: e.job.nextRun()
        }));
    }
}
