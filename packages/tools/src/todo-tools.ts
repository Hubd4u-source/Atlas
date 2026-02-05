/**
 * TODO Tools - Agent tools for TODO-driven workflow
 * Allows agent to create, update, and manage TODO lists
 */

import type { ToolDefinition, ToolContext } from '@atlas/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// These will be injected at runtime by the gateway
let todoManager: any = null;
let telegramChannel: any = null;

export function setTodoManager(manager: any) {
    todoManager = manager;
}

export function setTelegramChannel(channel: any) {
    telegramChannel = channel;
}

/**
 * send_todo - Create and send a TODO list to the user
 */
export const sendTodoTool: ToolDefinition = {
    name: 'send_todo',
    description: `Create a TODO list for the current task and send it to the user via Telegram. 
You MUST use this tool before starting any complex task. 
The TODO list should break down the work into small, specific steps.
After sending, the TODO will be persisted and you should execute steps one by one.`,
    parameters: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Title of the task (e.g., "Creating Todo App")'
            },
            steps: {
                type: 'array',
                description: 'Array of step descriptions. Each step should be small and specific.',
                items: { type: 'string', description: 'A single step description' }
            },
            projectPath: {
                type: 'string',
                description: 'Path to the project directory (e.g., "D:/Projects/my-app")'
            }
        },
        required: ['title', 'steps', 'projectPath']
    },
    handler: async (params, context) => {
        const { title, steps, projectPath } = params as { title: string, steps: string[], projectPath: string };

        if (!todoManager) {
            return { success: false, error: 'TodoManager not initialized' };
        }

        // Get chat ID from session
        const chatId = context.session.chatId;

        // Create the TODO
        const todo = await todoManager.createTodo(projectPath, title, steps, chatId);

        // Format and send to Telegram
        const message = todoManager.formatTodoMessage(todo);

        if (telegramChannel && chatId) {
            try {
                const messageId = await telegramChannel.sendMessageWithId(chatId, message);
                await todoManager.setTelegramMessageId(todo.id, messageId);
            } catch (error) {
                console.error('Failed to send TODO to Telegram:', error);
            }
        }

        return {
            success: true,
            todoId: todo.id,
            message: `Created TODO "${title}" with ${steps.length} steps`,
            steps: todo.items
        };
    }
};

/**
 * update_todo_step - Update the status of a TODO step
 */
export const updateTodoStepTool: ToolDefinition = {
    name: 'update_todo_step',
    description: `Update the status of a TODO step. Call this when you start, complete, or fail a step.
When completing a step, include notes about what was accomplished (e.g., "Created index.html with basic structure").
The Telegram message will be automatically updated to show progress.`,
    parameters: {
        type: 'object',
        properties: {
            todoId: {
                type: 'string',
                description: 'The TODO list ID (returned from send_todo)'
            },
            stepIndex: {
                type: 'number',
                description: 'Zero-based index of the step to update'
            },
            status: {
                type: 'string',
                description: 'New status: "in_progress", "completed", or "failed"',
                enum: ['in_progress', 'completed', 'failed']
            },
            notes: {
                type: 'string',
                description: 'Brief notes about what was accomplished (required when status is "completed")'
            },
            error: {
                type: 'string',
                description: 'Error message if status is "failed"'
            }
        },
        required: ['todoId', 'stepIndex', 'status']
    },
    handler: async (params, context) => {
        const { todoId, stepIndex, status, notes, error } = params as {
            todoId: string,
            stepIndex: number,
            status: 'in_progress' | 'completed' | 'failed',
            notes?: string,
            error?: string
        };

        if (!todoManager) {
            return { success: false, error: 'TodoManager not initialized' };
        }

        let item;
        if (status === 'in_progress') {
            item = await todoManager.startStep(todoId, stepIndex);
        } else if (status === 'completed') {
            item = await todoManager.completeStep(todoId, stepIndex, notes);
        } else if (status === 'failed') {
            item = await todoManager.failStep(todoId, stepIndex, error || 'Unknown error');
        }

        if (!item) {
            return { success: false, error: 'Step not found' };
        }

        // Update Telegram message
        const todo = todoManager.getTodo(todoId);
        if (todo && telegramChannel && todo.telegramChatId && todo.telegramMessageId) {
            try {
                const newMessage = todoManager.formatTodoMessage(todo);
                await telegramChannel.editMessage(todo.telegramChatId, todo.telegramMessageId, newMessage);
            } catch (error) {
                console.error('Failed to update Telegram message:', error);
            }
        }

        return {
            success: true,
            step: item,
            nextStep: todoManager.getNextPendingStep(todoId)
        };
    }
};

/**
 * read_project_context - Read the .atlas.md project context file
 */
export const readProjectContextTool: ToolDefinition = {
    name: 'read_project_context',
    description: `Read the .atlas.md project context file from a project directory.
This file contains project overview, requirements, architecture, and TODO history.
You MUST read this file before making changes to understand the project context.`,
    parameters: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory'
            }
        },
        required: ['projectPath']
    },
    handler: async (params, context) => {
        const { projectPath } = params as { projectPath: string };
        const contextFile = path.join(projectPath, '.atlas.md');

        try {
            const content = await fs.readFile(contextFile, 'utf-8');
            return {
                success: true,
                exists: true,
                content
            };
        } catch (error) {
            return {
                success: true,
                exists: false,
                content: null,
                message: 'Project context file does not exist. You should create one.'
            };
        }
    }
};

/**
 * update_project_context - Update or create the .atlas.md project context file
 */
export const updateProjectContextTool: ToolDefinition = {
    name: 'update_project_context',
    description: `Update or create the .atlas.md project context file.
Use this to maintain project documentation including overview, requirements, architecture, and progress notes.`,
    parameters: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory'
            },
            content: {
                type: 'string',
                description: 'Full markdown content for the context file'
            }
        },
        required: ['projectPath', 'content']
    },
    handler: async (params, context) => {
        const { projectPath, content } = params as { projectPath: string, content: string };
        const contextFile = path.join(projectPath, '.atlas.md');

        try {
            await fs.writeFile(contextFile, content, 'utf-8');
            return {
                success: true,
                message: `Updated project context at ${contextFile}`
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to write context file: ${error}`
            };
        }
    }
};

/**
 * get_active_todo - Get the currently active TODO (for crash recovery)
 */
export const getActiveTodoTool: ToolDefinition = {
    name: 'get_active_todo',
    description: `Get the currently active TODO list. Use this on startup to check if there's an incomplete task to resume.`,
    parameters: {
        type: 'object',
        properties: {}
    },
    handler: async (params, context) => {
        if (!todoManager) {
            return { success: false, error: 'TodoManager not initialized' };
        }

        const activeTodo = await todoManager.getActiveTodo();

        if (!activeTodo) {
            return {
                success: true,
                hasPending: false,
                message: 'No active TODO found'
            };
        }

        const nextStep = todoManager.getNextPendingStep(activeTodo.id);

        return {
            success: true,
            hasPending: true,
            todo: activeTodo,
            nextStepIndex: nextStep,
            nextStep: nextStep >= 0 ? activeTodo.items[nextStep] : null,
            message: `Found active TODO: "${activeTodo.title}" - Resume from step ${nextStep + 1}`
        };
    }
};

// Export all TODO tools
export const todoTools: ToolDefinition[] = [
    sendTodoTool,
    updateTodoStepTool,
    readProjectContextTool,
    updateProjectContextTool,
    getActiveTodoTool
];



