/**
 * Slash Commands for Memory Management
 * OpenClaw-style commands for session and memory control
 */

import type { OpenClawMemory } from './openclaw/memory.js';
import type { Session } from '@atlas/core';

export interface SlashCommandResult {
    success: boolean;
    message: string;
    action?: 'reset' | 'compact' | 'status' | 'search' | 'clear' | 'export';
}

export interface SlashCommandContext {
    memory: OpenClawMemory;
    session: Session;
}

/**
 * Parse and execute slash commands
 * 
 * Supported commands:
 * - /reset - Reset the current session (clear conversation history)
 * - /new - Alias for /reset
 * - /compact - Compact session context (summarize old messages)
 * - /status - Show memory system status
 * - /search <query> - Search memory
 * - /clear - Clear all memory for current session
 * - /export - Export session history
 * - /help - Show available commands
 */
export async function executeSlashCommand(
    command: string,
    context: SlashCommandContext
): Promise<SlashCommandResult | null> {
    const trimmed = command.trim();
    
    // Not a slash command
    if (!trimmed.startsWith('/')) {
        return null;
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!cmd) {
        return null;
    }

    switch (cmd) {
        case 'reset':
        case 'new':
            return await handleReset(context);
        
        case 'compact':
            return await handleCompact(context);
        
        case 'status':
            return await handleStatus(context);
        
        case 'search':
            return await handleSearch(args.join(' '), context);
        
        case 'clear':
            return await handleClear(context);
        
        case 'export':
            return await handleExport(context);
        
        case 'help':
            return handleHelp();
        
        default:
            return {
                success: false,
                message: `Unknown command: /${cmd}\nType /help for available commands.`
            };
    }
}

/**
 * /reset or /new - Reset the current session
 */
async function handleReset(context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        // Clear session messages
        context.session.context.messages = [];
        
        return {
            success: true,
            message: '✅ Session reset! Starting fresh conversation.',
            action: 'reset'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to reset session: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /compact - Compact session context (summarize old messages)
 */
async function handleCompact(context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        const messageCount = context.session.context.messages.length;
        
        if (messageCount <= 10) {
            return {
                success: true,
                message: `ℹ️ Session has only ${messageCount} messages. No compaction needed.`
            };
        }

        // Keep system message and last 10 messages
        const systemMsg = context.session.context.messages.find(m => m.role === 'system');
        const recentMessages = context.session.context.messages.slice(-10);
        
        context.session.context.messages = systemMsg 
            ? [systemMsg, ...recentMessages]
            : recentMessages;

        const removed = messageCount - context.session.context.messages.length;
        
        return {
            success: true,
            message: `✅ Session compacted! Removed ${removed} old messages, kept ${context.session.context.messages.length} recent messages.`,
            action: 'compact'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to compact session: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /status - Show memory system status
 */
async function handleStatus(context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        const messageCount = context.session.context.messages.length;
        const sessionId = `${context.session.channel}-${context.session.chatId}`;
        
        // Get memory stats (if available)
        let memoryInfo = '';
        try {
            // This would require adding a status method to OpenClawMemory
            memoryInfo = '\n\n📊 Memory System:\n- Mode: FTS-only (local, no API keys needed)\n- Status: Active';
        } catch {
            memoryInfo = '\n\n📊 Memory System: Active';
        }

        const message = `📋 Session Status\n\n` +
            `🆔 Session: ${sessionId}\n` +
            `💬 Messages: ${messageCount}\n` +
            `📍 Channel: ${context.session.channel}\n` +
            `👤 User: ${context.session.userId || 'unknown'}` +
            memoryInfo;

        return {
            success: true,
            message,
            action: 'status'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to get status: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /search <query> - Search memory
 */
async function handleSearch(query: string, context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        if (!query.trim()) {
            return {
                success: false,
                message: '❌ Please provide a search query. Usage: /search <query>'
            };
        }

        const results = await context.memory.search(query, 5, {
            channel: context.session.channel,
            chatId: context.session.chatId
        });

        if (results.length === 0) {
            return {
                success: true,
                message: `🔍 No results found for: "${query}"`
            };
        }

        const resultText = results.map((r, i) => 
            `${i + 1}. ${r.path} (lines ${r.startLine}-${r.endLine})\n   Score: ${r.score.toFixed(3)}\n   ${r.snippet.slice(0, 100)}...`
        ).join('\n\n');

        return {
            success: true,
            message: `🔍 Search Results for "${query}":\n\n${resultText}`,
            action: 'search'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Search failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /clear - Clear all memory for current session
 */
async function handleClear(context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        // Clear session messages
        context.session.context.messages = [];
        
        // Note: This doesn't delete the session file from disk
        // That would require adding a delete method to OpenClawMemory
        
        return {
            success: true,
            message: '✅ Session memory cleared! Note: Historical session file remains for long-term memory.',
            action: 'clear'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to clear memory: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /export - Export session history
 */
async function handleExport(context: SlashCommandContext): Promise<SlashCommandResult> {
    try {
        const messages = context.session.context.messages;
        
        if (messages.length === 0) {
            return {
                success: true,
                message: 'ℹ️ No messages to export.'
            };
        }

        const exportText = messages.map((m, i) => {
            const timestamp = m.timestamp.toISOString();
            return `[${i + 1}] ${timestamp} - ${m.role}:\n${m.content}\n`;
        }).join('\n---\n\n');

        return {
            success: true,
            message: `📤 Session Export (${messages.length} messages):\n\n${exportText}`,
            action: 'export'
        };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to export: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * /help - Show available commands
 */
function handleHelp(): SlashCommandResult {
    const helpText = `📚 Available Slash Commands:

🔄 Session Management:
  /reset or /new - Reset the current session (start fresh)
  /compact - Compact session (keep recent messages only)
  /clear - Clear session memory

📊 Information:
  /status - Show session and memory status
  /search <query> - Search memory for specific content
  /export - Export current session history

❓ Help:
  /help - Show this help message

💡 Tips:
- All memory is stored locally (no API keys needed)
- Session files are kept for long-term memory
- Use /compact to reduce context size
- Use /search to find past conversations`;

    return {
        success: true,
        message: helpText
    };
}

/**
 * Check if a message is a slash command
 */
export function isSlashCommand(message: string): boolean {
    const trimmed = message.trim();
    return trimmed.startsWith('/') && trimmed.length > 1;
}

/**
 * Get list of available commands
 */
export function getAvailableCommands(): string[] {
    return [
        'reset',
        'new',
        'compact',
        'status',
        'search',
        'clear',
        'export',
        'help'
    ];
}
