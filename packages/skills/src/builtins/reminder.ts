
import type { Skill, SkillContext } from '../types.js';
import type { ToolContext } from '@atlas/core';

interface ScheduledTask {
    id: string;
    description: string;
    executeAt: number; // Timestamp
    createdAt: number;
    channel?: string;
    chatId?: string;
}

const tasks: Map<string, ScheduledTask> = new Map();

const schedulerSkill: Skill = {
    id: 'reminder', // Keep ID 'reminder' to avoid breaking existing references
    name: 'Scheduler Skill',
    version: '2.0.0',
    description: 'Advanced task scheduling and reminders',
    author: 'Atlas',

    onLoad: async (context: SkillContext) => {
        console.log('Scheduler Skill loaded');
    },

    tools: [
        {
            name: 'create_reminder',
            description: 'Schedule a task or reminder for the future. Use this to follow up on async processes.',
            parameters: {
                type: 'object',
                properties: {
                    description: {
                        type: 'string',
                        description: 'What needs to be done? (e.g., "Check server logs", "Remind user to deploy")'
                    },
                    delay_minutes: {
                        type: 'number',
                        description: 'How many minutes from now?'
                    }
                },
                required: ['description', 'delay_minutes']
            },
            handler: async (args: any, context: ToolContext) => {
                const id = Math.random().toString(36).substring(7);
                const executeAt = Date.now() + (args.delay_minutes * 60 * 1000);

                tasks.set(id, {
                    id,
                    description: args.description,
                    executeAt,
                    createdAt: Date.now(),
                    channel: context.session?.channel,
                    chatId: context.session?.chatId
                });

                return `Task Scheduled: "${args.description}" in ${args.delay_minutes} minutes (ID: ${id})`;
            }
        },
        {
            name: 'list_scheduled_tasks',
            description: 'See all pending scheduled tasks.',
            parameters: { type: 'object', properties: {} },
            handler: async (args: any, context: ToolContext) => {
                if (tasks.size === 0) return "No scheduled tasks.";

                let output = "📅 Scheduled Tasks:\n";
                for (const task of tasks.values()) {
                    const minutesLeft = Math.round((task.executeAt - Date.now()) / 60000);
                    output += `- [${task.id}] "${task.description}" in ${minutesLeft} mins\n`;
                }
                return output;
            }
        }
    ],

    schedules: [
        {
            cron: '*/30 * * * * *', // Check every 30 seconds
            handler: async (context: SkillContext) => {
                const now = Date.now();
                const dueTasks: ScheduledTask[] = [];

                // Find due tasks
                for (const task of tasks.values()) {
                    if (task.executeAt <= now) {
                        dueTasks.push(task);
                    }
                }

                // Execute and remove
                for (const task of dueTasks) {
                    tasks.delete(task.id);

                    const timeString = new Date().toLocaleString();
                    const sysInfo = `OS: ${process.platform} | Free Mem: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB Used`;

                    const message = `[SYSTEM INTERRUPT] ⏰ **SCHEDULED EVENT**
📋 Task: ${task.description}
📅 Time: ${timeString}
💻 System: ${sysInfo}
(Task ID: ${task.id})`;

                    if (task.chatId && context.sendMessageTo) {
                        await context.sendMessageTo(task.chatId, message);
                    } else if (context.sendMessage) {
                        await context.sendMessage(message);
                    } else {
                        console.log(message);
                    }
                }
            }
        }
    ]
};

export default schedulerSkill;

