/**
 * Task Queue Tools - Durable 24/7 task execution
 */

import type { ToolDefinition } from '@atlas/core';
import type { TaskManager, TaskPriority, TaskStatus } from '@atlas/memory';

let taskManager: TaskManager | null = null;

export function setTaskManager(manager: TaskManager) {
    taskManager = manager;
}

const parseRunAfter = (runAfter?: string, delayMinutes?: number): number => {
    if (typeof delayMinutes === 'number' && !Number.isNaN(delayMinutes)) {
        return Date.now() + delayMinutes * 60 * 1000;
    }
    if (runAfter) {
        const parsed = Date.parse(runAfter);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now();
};

export const enqueueTasksTool: ToolDefinition = {
    name: 'enqueue_tasks',
    description: `Create one or more tasks for the autonomous task queue. 
Use this when the user provides multiple tasks or when work should be scheduled for later.`,
    parameters: {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                description: 'Array of task objects. Each task supports: title (string), description (string), priority (low|medium|high|critical), runAfter (ISO string), delayMinutes (number), maxRetries (number).',
                items: {
                    type: 'object',
                    description: 'Task object'
                }
            }
        },
        required: ['tasks']
    },
    handler: async (args, context) => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized' };
        }

        const { tasks } = args as { tasks: Array<any> };
        if (!tasks || tasks.length === 0) {
            return { success: false, error: 'No tasks provided' };
        }

        const channel = context.session.channel;
        const chatId = context.session.chatId;
        const userId = context.session.userId;

        const records = taskManager.enqueueTasks(tasks.map((t) => ({
            title: t.title,
            description: t.description,
            priority: (t.priority as TaskPriority) || 'medium',
            channel,
            chatId,
            userId,
            runAfter: parseRunAfter(t.runAfter, t.delayMinutes),
            maxRetries: t.maxRetries
        })));

        return {
            success: true,
            count: records.length,
            tasks: records.map(r => ({
                id: r.id,
                title: r.title,
                status: r.status,
                runAfter: new Date(r.runAfter).toISOString()
            }))
        };
    }
};

export const listTasksTool: ToolDefinition = {
    name: 'list_tasks',
    description: 'List tasks in the queue (optionally by status).',
    parameters: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                description: 'Filter by status',
                enum: ['queued', 'retrying', 'in_progress', 'completed', 'failed', 'cancelled']
            },
            limit: {
                type: 'number',
                description: 'Max tasks to return (default 20)'
            }
        }
    },
    handler: async (args) => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized' };
        }

        const { status, limit = 20 } = args as { status?: TaskStatus; limit?: number };
        const tasks = taskManager.listTasks(status, limit);

        return {
            success: true,
            count: tasks.length,
            tasks: tasks.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                runAfter: new Date(t.runAfter).toISOString()
            }))
        };
    }
};

export const scheduleTaskTool: ToolDefinition = {
    name: 'schedule_task',
    description: 'Schedule a recurring task. This creates a cron schedule that enqueues a task at each run.',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task details' },
            cron: { type: 'string', description: 'Cron expression (e.g., "0 9 * * *")' },
            priority: { type: 'string', description: 'Priority', enum: ['low', 'medium', 'high', 'critical'] },
            maxRetries: { type: 'number', description: 'Max retries on failure (default 3)' }
        },
        required: ['title', 'cron']
    },
    handler: async (args, context) => {
        const { title, description, cron, priority, maxRetries } = args as {
            title: string;
            description?: string;
            cron: string;
            priority?: TaskPriority;
            maxRetries?: number;
        };

        if ((context as any).scheduleTask) {
            (context as any).scheduleTask({
                title,
                description,
                cron,
                priority: priority || 'medium',
                maxRetries: maxRetries ?? 3,
                channel: context.session.channel,
                chatId: context.session.chatId,
                userId: context.session.userId
            });
        } else if (taskManager) {
            // Fallback: enqueue a single task with runAfter set to now if scheduling isn't available
            taskManager.enqueueTasks([{
                title,
                description,
                priority: priority || 'medium',
                channel: context.session.channel,
                chatId: context.session.chatId,
                userId: context.session.userId,
                maxRetries: maxRetries
            }]);
        }

        return {
            success: true,
            scheduled: {
                title,
                description,
                cron,
                priority: priority || 'medium',
                maxRetries: maxRetries ?? 3,
                channel: context.session.channel,
                chatId: context.session.chatId
            }
        };
    }
};

export const taskTools: ToolDefinition[] = [
    enqueueTasksTool,
    listTasksTool,
    scheduleTaskTool
];

