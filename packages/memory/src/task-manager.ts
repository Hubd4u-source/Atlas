/**
 * Task Manager - Durable task queue for autonomous 24/7 execution
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { EventEmitter } from "node:events";

export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus =
    | "queued"
    | "retrying"
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled";

export interface TaskRecord {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    channel: string;
    chatId: string;
    userId?: string;
    runAfter: number;
    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
    retryCount: number;
    maxRetries: number;
    payload?: Record<string, unknown>;
    result?: string;
    error?: string;
}

export interface TaskManagerOptions {
    dataDir: string;
    dbFileName?: string;
}

const PRIORITY_SCORE: Record<TaskPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};

export class TaskManager extends EventEmitter {
    private db: Database.Database;
    private options: TaskManagerOptions;

    constructor(options: TaskManagerOptions) {
        super();
        this.options = options;
        const dbFile = options.dbFileName || "tasks.db";
        const dbPath = path.join(options.dataDir, dbFile);
        fs.mkdirSync(options.dataDir, { recursive: true });
        this.db = new Database(dbPath);
        this.ensureSchema();
    }

    private ensureSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                priority INTEGER NOT NULL,
                channel TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                user_id TEXT,
                run_after INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                started_at INTEGER,
                completed_at INTEGER,
                retry_count INTEGER NOT NULL,
                max_retries INTEGER NOT NULL,
                payload TEXT,
                result TEXT,
                error TEXT
            );
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tasks_status_run_after
            ON tasks (status, run_after, priority, created_at);
        `);
    }

    private async logEvent(message: string): Promise<void> {
        try {
            const memoryDir = path.join(this.options.dataDir, "memory");
            fs.mkdirSync(memoryDir, { recursive: true });
            const logPath = path.join(memoryDir, "tasks.md");
            const timestamp = new Date().toISOString();
            fs.appendFileSync(logPath, `\n## ${timestamp}\n${message}\n`);
        } catch {
            // Avoid breaking flow on logging errors
        }
    }

    enqueueTasks(tasks: Array<{
        title: string;
        description?: string;
        priority?: TaskPriority;
        channel: string;
        chatId: string;
        userId?: string;
        runAfter?: number;
        maxRetries?: number;
        payload?: Record<string, unknown>;
    }>): TaskRecord[] {
        const now = Date.now();
        const insert = this.db.prepare(`
            INSERT INTO tasks (
                id, title, description, status, priority, channel, chat_id, user_id,
                run_after, created_at, updated_at, retry_count, max_retries, payload
            ) VALUES (
                @id, @title, @description, @status, @priority, @channel, @chat_id, @user_id,
                @run_after, @created_at, @updated_at, @retry_count, @max_retries, @payload
            )
        `);

        const records: TaskRecord[] = [];
        const tx = this.db.transaction(() => {
            for (const task of tasks) {
                const id = `task_${now}_${Math.random().toString(36).slice(2, 8)}`;
                const priority = task.priority || "medium";
                const record: TaskRecord = {
                    id,
                    title: task.title,
                    description: task.description,
                    status: "queued",
                    priority,
                    channel: task.channel,
                    chatId: task.chatId,
                    userId: task.userId,
                    runAfter: task.runAfter ?? now,
                    createdAt: now,
                    updatedAt: now,
                    retryCount: 0,
                    maxRetries: task.maxRetries ?? 3,
                    payload: task.payload
                };

                insert.run({
                    id: record.id,
                    title: record.title,
                    description: record.description,
                    status: record.status,
                    priority: PRIORITY_SCORE[record.priority],
                    channel: record.channel,
                    chat_id: record.chatId,
                    user_id: record.userId,
                    run_after: record.runAfter,
                    created_at: record.createdAt,
                    updated_at: record.updatedAt,
                    retry_count: record.retryCount,
                    max_retries: record.maxRetries,
                    payload: record.payload ? JSON.stringify(record.payload) : null
                });

                records.push(record);
            }
        });
        tx();

        void this.logEvent(`Enqueued ${records.length} task(s):\n${records.map(r => `- [${r.priority}] ${r.title} (${r.id})`).join('\n')}`);
        for (const record of records) {
            this.emit("changed", { type: "enqueued", task: record });
        }

        return records;
    }

    getNextRunnableTask(): TaskRecord | null {
        const now = Date.now();
        const row = this.db.prepare(`
            SELECT * FROM tasks
            WHERE status IN ('queued', 'retrying') AND run_after <= ?
            ORDER BY priority DESC, run_after ASC, created_at ASC
            LIMIT 1
        `).get(now) as any;

        if (!row) return null;
        return this.rowToTask(row);
    }

    startTask(id: string): void {
        const now = Date.now();
        this.db.prepare(`
            UPDATE tasks
            SET status = 'in_progress', started_at = ?, updated_at = ?
            WHERE id = ?
        `).run(now, now, id);
        void this.logEvent(`Started task ${id}`);
        const task = this.getTask(id);
        if (task) {
            this.emit("changed", { type: "started", task });
        }
    }

    completeTask(id: string, result?: string): void {
        const now = Date.now();
        this.db.prepare(`
            UPDATE tasks
            SET status = 'completed', completed_at = ?, updated_at = ?, result = ?
            WHERE id = ?
        `).run(now, now, result || null, id);
        void this.logEvent(`Completed task ${id}${result ? `\nResult: ${result}` : ''}`);
        const task = this.getTask(id);
        if (task) {
            this.emit("changed", { type: "completed", task });
        }
    }

    failTask(id: string, error: string, retryDelayMs?: number): TaskRecord | null {
        const task = this.getTask(id);
        if (!task) return null;

        const now = Date.now();
        const nextRetryCount = task.retryCount + 1;
        const canRetry = nextRetryCount <= task.maxRetries;

        if (canRetry) {
            const runAfter = now + (retryDelayMs ?? 5000 * nextRetryCount);
            this.db.prepare(`
                UPDATE tasks
                SET status = 'retrying', retry_count = ?, run_after = ?, updated_at = ?, error = ?
                WHERE id = ?
            `).run(nextRetryCount, runAfter, now, error, id);
            void this.logEvent(`Retrying task ${id} (attempt ${nextRetryCount}/${task.maxRetries})\nError: ${error}`);
        } else {
            this.db.prepare(`
                UPDATE tasks
                SET status = 'failed', retry_count = ?, completed_at = ?, updated_at = ?, error = ?
                WHERE id = ?
            `).run(nextRetryCount, now, now, error, id);
            void this.logEvent(`Failed task ${id}\nError: ${error}`);
        }

        const updated = this.getTask(id);
        if (updated) {
            this.emit("changed", { type: canRetry ? "retrying" : "failed", task: updated });
        }
        return updated;
    }

    cancelTask(id: string): void {
        const now = Date.now();
        this.db.prepare(`
            UPDATE tasks
            SET status = 'cancelled', updated_at = ?
            WHERE id = ?
        `).run(now, id);
        void this.logEvent(`Cancelled task ${id}`);
        const task = this.getTask(id);
        if (task) {
            this.emit("changed", { type: "cancelled", task });
        }
    }

    listTasks(status?: TaskStatus, limit = 50): TaskRecord[] {
        const rows = status
            ? this.db.prepare(`SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?`).all(status, limit)
            : this.db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`).all(limit);
        return rows.map(row => this.rowToTask(row as any));
    }

    getTask(id: string): TaskRecord | null {
        const row = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as any;
        return row ? this.rowToTask(row) : null;
    }

    private rowToTask(row: any): TaskRecord {
        const priority = Object.entries(PRIORITY_SCORE).find(([, v]) => v === row.priority)?.[0] as TaskPriority | undefined;
        return {
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            status: row.status as TaskStatus,
            priority: priority || "medium",
            channel: row.channel,
            chatId: row.chat_id,
            userId: row.user_id || undefined,
            runAfter: row.run_after,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at || undefined,
            completedAt: row.completed_at || undefined,
            retryCount: row.retry_count,
            maxRetries: row.max_retries,
            payload: row.payload ? JSON.parse(row.payload) : undefined,
            result: row.result || undefined,
            error: row.error || undefined
        };
    }
}
