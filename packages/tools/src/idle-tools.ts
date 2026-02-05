/**
 * Idle/Bored Notification Tool
 * Allows agent to proactively notify user when idle
 */

import type { ToolDefinition } from '@atlas/core';

/**
 * notify_bored - Notify user that agent is idle
 */
export const notifyBoredTool: ToolDefinition = {
    name: 'notify_bored',
    description: `Call this when you have completed all tasks and have nothing to do. 
This sends a friendly message to the user letting them know you're available.
Use this instead of just going silent when idle.`,
    parameters: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'Optional custom message to include (e.g., "Finished the dashboard, ready for next task")'
            }
        }
    },
    handler: async (params, context) => {
        const { message } = params as { message?: string };

        const defaultMsg = "💤 I'm currently idle with no active tasks. Let me know if you need anything!";
        const fullMessage = message || defaultMsg;

        if (context.sendMessage) {
            await context.sendMessage({ text: fullMessage });
        }

        return {
            success: true,
            message: 'User notified of idle status',
            sentMessage: fullMessage
        };
    }
};

export const idleTools: ToolDefinition[] = [notifyBoredTool];

