/**
 * TODO Manager - Structured task planning and execution tracking
 * Enables TODO-first workflow with crash recovery
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface TodoItem {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    error?: string;
    notes?: string;  // Context about what was accomplished
}

export interface TodoList {
    id: string;
    projectPath: string;
    title: string;
    items: TodoItem[];
    createdAt: string;
    completedAt?: string;
    telegramChatId?: string;
    telegramMessageId?: number;
    currentStep: number;
    status: 'active' | 'completed' | 'abandoned';
}

export interface TodoManagerOptions {
    dataDir: string;
}

export class TodoManager {
    private dataDir: string;
    private todosFile: string;
    private todos: Map<string, TodoList> = new Map();
    private activeTodoId: string | null = null;

    constructor(options: TodoManagerOptions) {
        this.dataDir = options.dataDir;
        this.todosFile = path.join(this.dataDir, 'todos.json');
    }

    private async logEvent(message: string): Promise<void> {
        try {
            const memoryDir = path.join(this.dataDir, 'memory');
            await fs.mkdir(memoryDir, { recursive: true });
            const logPath = path.join(memoryDir, 'todos.md');
            const timestamp = new Date().toISOString();
            await fs.appendFile(logPath, `\n## ${timestamp}\n${message}\n`);
        } catch {
            // Avoid breaking flow on logging errors
        }
    }

    /**
     * Initialize - load existing TODOs from disk
     */
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            const content = await fs.readFile(this.todosFile, 'utf-8');
            const data = JSON.parse(content) as { todos: TodoList[], activeTodoId: string | null };

            for (const todo of data.todos) {
                this.todos.set(todo.id, todo);
            }
            this.activeTodoId = data.activeTodoId;

            console.log(`📋 Loaded ${this.todos.size} TODO lists`);
        } catch (error) {
            // File doesn't exist yet
            console.log('📋 No existing TODOs found, starting fresh');
        }
    }

    /**
     * Save all TODOs to disk
     */
    private async save(): Promise<void> {
        const data = {
            todos: Array.from(this.todos.values()),
            activeTodoId: this.activeTodoId
        };
        await fs.writeFile(this.todosFile, JSON.stringify(data, null, 2));
    }

    /**
     * Create a new TODO list
     */
    async createTodo(
        projectPath: string,
        title: string,
        items: string[],
        telegramChatId?: string
    ): Promise<TodoList> {
        const id = `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const todoItems: TodoItem[] = items.map((desc, index) => ({
            id: `step_${index + 1}`,
            description: desc,
            status: 'pending'
        }));

        const todo: TodoList = {
            id,
            projectPath,
            title,
            items: todoItems,
            createdAt: new Date().toISOString(),
            currentStep: 0,
            status: 'active',
            telegramChatId
        };

        this.todos.set(id, todo);
        this.activeTodoId = id;
        await this.save();

        console.log(`📋 Created TODO: ${title} (${items.length} steps)`);
        return todo;
    }

    /**
     * Get the currently active TODO (for crash recovery)
     */
    async getActiveTodo(): Promise<TodoList | null> {
        if (!this.activeTodoId) return null;
        return this.todos.get(this.activeTodoId) || null;
    }

    /**
     * Get a TODO by ID
     */
    getTodo(todoId: string): TodoList | undefined {
        return this.todos.get(todoId);
    }

    /**
     * Start a step (mark as in_progress)
     */
    async startStep(todoId: string, stepIndex: number): Promise<TodoItem | null> {
        const todo = this.todos.get(todoId);
        if (!todo || stepIndex >= todo.items.length) return null;

        const item = todo.items[stepIndex];
        item.status = 'in_progress';
        item.startedAt = new Date().toISOString();
        todo.currentStep = stepIndex;

        await this.save();
        return item;
    }

    /**
     * Complete a step with optional notes about what was done
     */
    async completeStep(todoId: string, stepIndex: number, notes?: string): Promise<TodoItem | null> {
        const todo = this.todos.get(todoId);
        if (!todo || stepIndex >= todo.items.length) return null;

        const item = todo.items[stepIndex];
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
        if (notes) {
            item.notes = notes;
        }

        // Check if all steps are done
        const allDone = todo.items.every(i => i.status === 'completed');
        if (allDone) {
            todo.status = 'completed';
            todo.completedAt = new Date().toISOString();
            this.activeTodoId = null;
        }

        await this.save();
        return item;
    }

    /**
     * Mark a step as failed
     */
    async failStep(todoId: string, stepIndex: number, error: string): Promise<TodoItem | null> {
        const todo = this.todos.get(todoId);
        if (!todo || stepIndex >= todo.items.length) return null;

        const item = todo.items[stepIndex];
        item.status = 'failed';
        item.error = error;
        item.completedAt = new Date().toISOString();

        await this.save();
        return item;
    }

    /**
     * Set the Telegram message ID for live updates
     */
    async setTelegramMessageId(todoId: string, messageId: number): Promise<void> {
        const todo = this.todos.get(todoId);
        if (todo) {
            todo.telegramMessageId = messageId;
            await this.save();
        }
    }

    /**
     * Format TODO list as Markdown for Telegram
     */
    formatTodoMessage(todo: TodoList): string {
        const statusEmoji = {
            pending: '⬜',
            in_progress: '🔄',
            completed: '✅',
            failed: '❌'
        };

        let msg = `📋 **${todo.title}**\n\n`;

        todo.items.forEach((item, index) => {
            const emoji = statusEmoji[item.status];
            msg += `${emoji} ${index + 1}. ${item.description}\n`;
        });

        const completed = todo.items.filter(i => i.status === 'completed').length;
        msg += `\n📊 Progress: ${completed}/${todo.items.length}`;

        return msg;
    }

    /**
     * Get the next pending step index
     */
    getNextPendingStep(todoId: string): number {
        const todo = this.todos.get(todoId);
        if (!todo) return -1;

        return todo.items.findIndex(item =>
            item.status === 'pending' || item.status === 'in_progress'
        );
    }

    /**
     * Clear active TODO (abandon)
     */
    async abandonTodo(todoId: string): Promise<void> {
        const todo = this.todos.get(todoId);
        if (todo) {
            todo.status = 'abandoned';
            if (this.activeTodoId === todoId) {
                this.activeTodoId = null;
            }
            await this.save();
        }
    }

    /**
     * Format TODO context for AI resume (includes what was accomplished)
     */
    formatResumeContext(todo: TodoList): string {
        let context = `## Resume Previous Task\n\n`;
        context += `**Task:** ${todo.title}\n`;
        context += `**Project:** ${todo.projectPath}\n\n`;
        context += `### Progress:\n`;

        todo.items.forEach((item, index) => {
            const status = item.status === 'completed' ? '✅' :
                item.status === 'in_progress' ? '🔄' :
                    item.status === 'failed' ? '❌' : '⬜';
            context += `${status} **Step ${index + 1}:** ${item.description}\n`;
            if (item.notes) {
                context += `   → Completed: ${item.notes}\n`;
            }
            if (item.error) {
                context += `   → Error: ${item.error}\n`;
            }
        });

        const nextStep = this.getNextPendingStep(todo.id);
        if (nextStep >= 0) {
            context += `\n### Next Action:\n`;
            context += `Continue from Step ${nextStep + 1}: ${todo.items[nextStep].description}\n`;
            context += `\n**Important:** Do NOT restart from the beginning. Only complete the remaining steps.`;
        }

        return context;
    }
}





