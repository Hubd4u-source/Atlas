/**
 * Session Manager - Handles conversation sessions across channels
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionContext, ChannelType, ConversationMessage } from './types.js';

export class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private maxMessages: number;

    constructor(maxConversationHistory: number = 100) {
        this.maxMessages = maxConversationHistory;
    }

    /**
     * Generate a unique session key from channel and chatId
     */
    private getSessionKey(channel: ChannelType, chatId: string): string {
        return `${channel}:${chatId}`;
    }

    /**
     * Get or create a session for a channel/chat combination
     */
    getOrCreate(channel: ChannelType, chatId: string, userId?: string): Session {
        const key = this.getSessionKey(channel, chatId);

        let session = this.sessions.get(key);
        if (!session) {
            session = this.createSession(channel, chatId, userId);
            this.sessions.set(key, session);
        } else {
            session.lastActiveAt = new Date();
        }

        return session;
    }

    /**
     * Create a new session
     */
    private createSession(channel: ChannelType, chatId: string, userId?: string): Session {
        const now = new Date();
        return {
            id: uuidv4(),
            channel,
            chatId,
            userId,
            createdAt: now,
            lastActiveAt: now,
            context: {
                messages: [],
                metadata: {}
            }
        };
    }

    /**
     * Get a session by key
     */
    get(channel: ChannelType, chatId: string): Session | undefined {
        return this.sessions.get(this.getSessionKey(channel, chatId));
    }

    /**
     * Add a message to session context
     */
    addMessage(session: Session, message: ConversationMessage): void {
        session.context.messages.push(message);
        session.lastActiveAt = new Date();

        // Trim old messages if over limit
        if (session.context.messages.length > this.maxMessages) {
            // Keep system message if present, trim from the start
            const systemMsg = session.context.messages.find(m => m.role === 'system');
            session.context.messages = session.context.messages.slice(-this.maxMessages);
            if (systemMsg && session.context.messages[0]?.role !== 'system') {
                session.context.messages.unshift(systemMsg);
            }
        }
    }

    /**
     * Get all messages for a session (for AI context)
     */
    getMessages(session: Session): ConversationMessage[] {
        return session.context.messages;
    }

    /**
     * Clear session messages
     */
    clearMessages(session: Session): void {
        session.context.messages = [];
    }

    /**
     * Set session metadata
     */
    setMetadata(session: Session, key: string, value: unknown): void {
        session.context.metadata[key] = value;
    }

    /**
     * Get session metadata
     */
    getMetadata(session: Session, key: string): unknown {
        return session.context.metadata[key];
    }

    /**
     * Delete a session
     */
    delete(channel: ChannelType, chatId: string): boolean {
        return this.sessions.delete(this.getSessionKey(channel, chatId));
    }

    /**
     * Get all active sessions
     */
    getAllSessions(): Session[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Clean up stale sessions (older than specified hours)
     */
    cleanupStale(maxAgeHours: number = 24): number {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        let cleaned = 0;

        for (const [key, session] of this.sessions) {
            if (session.lastActiveAt < cutoff) {
                this.sessions.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}
