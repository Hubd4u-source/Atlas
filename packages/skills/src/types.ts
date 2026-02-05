/**
 * Skills Framework Types
 */

import type { ToolDefinition, IncomingMessage, Session, MessageContent } from '@atlas/core';

/**
 * Context provided to skills
 */
export interface SkillContext {
    session?: Session;
    sendMessage?: (content: string | MessageContent) => Promise<void>;
    sendMessageTo?: (chatId: string, content: string | MessageContent) => Promise<void>;
    sendToExtension?: (message: any) => Promise<void>;
    executeTool?: (name: string, params: any) => Promise<any>;
    [key: string]: unknown;
}

/**
 * Scheduled task definition
 */
export interface SkillSchedule {
    cron: string;
    handler: (context: SkillContext) => Promise<void>;
}

/**
 * Skill Plugin Interface
 */
export interface Skill {
    id: string;          // Unique identifier (e.g., 'gmail', 'weather')
    name: string;        // Display name
    version: string;
    description: string;
    author?: string;

    // Tools provided by this skill
    tools?: ToolDefinition[];

    // Lifecycle methods
    onLoad?: (context: SkillContext) => Promise<void>;
    onUnload?: () => Promise<void>;

    // Event handlers
    onMessage?: (message: IncomingMessage, context: SkillContext) => Promise<void>;

    // Schedules
    schedules?: SkillSchedule[];
}

