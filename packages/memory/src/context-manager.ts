/**
 * Context Manager - Smart context windowing and summarization
 * Prevents API context length errors by intelligently managing message history
 */

import type { ConversationMessage } from '@atlas/core';

export interface ContextManagerOptions {
    /** Maximum messages to include in context (default: 10) */
    maxMessages?: number;
    /** Maximum characters for total context (default: 12000) */
    maxContextLength?: number;
    /** Number of recent messages to always keep (default: 4) */
    recentWindowSize?: number;
}

export interface ContextLayers {
    immediate: ConversationMessage[];
    working: {
        summary: string;
        activeTask?: string;
    };
    persistent: {
        facts: string[];
        relevantHistory: string[];
    };
}

export interface ManagedContext {
    messages: ConversationMessage[]; // Flattened for backward compatibility
    layers: ContextLayers;
    wasTruncated: boolean;
    originalCount: number;
}

export class ContextManager {
    private options: Required<ContextManagerOptions>;
    // Map conversationId -> summary
    private conversationSummaries: Map<string, string> = new Map();
    // Map conversationId -> index of last summarized message
    private lastSummarizedIndices: Map<string, number> = new Map();

    constructor(options: ContextManagerOptions = {}) {
        this.options = {
            maxMessages: options.maxMessages ?? 100,      // Support deeper history
            maxContextLength: options.maxContextLength ?? 200000,  // Modern LLM capacity (approx 50k tokens)
            recentWindowSize: options.recentWindowSize ?? 10    // Keep more recent messages
        };
    }

    /**
     * Prepare context using OpenClaw-style Monolithic Pruning
     */
    prepareContext(
        messages: ConversationMessage[],
        conversationId: string,
        ragContext?: { facts: string[], history: string[] }
    ): ManagedContext {
        const originalCount = messages.length;
        const contextMessages: ConversationMessage[] = [];

        // 1. RAG System Message
        if (ragContext && (ragContext.facts.length > 0 || ragContext.history.length > 0)) {
            let content = '## Relevant Context\n';
            if (ragContext.facts.length > 0) content += '### Memories/Facts\n' + ragContext.facts.map(f => `- ${f}`).join('\n') + '\n';
            if (ragContext.history.length > 0) content += '### Relevant Past Messages\n' + ragContext.history.join('\n') + '\n';
            contextMessages.push({ role: 'system', content, timestamp: new Date() });
        }

        // 2. Full Conversation History
        // We take all messages passed to us. The Gateway should raise the limit (e.g. 100).
        contextMessages.push(...messages);

        // 3. Smart Pruning (OpenClaw)
        // This handles head+tail trimming and preserves recent turns.
        const finalizedMessages = this.pruneContext(contextMessages);

        const finalLength = this.calculateContextLength(finalizedMessages);
        console.log(`🧠 OpenClaw Memory: [Input: ${originalCount}] -> [Pruned: ${finalizedMessages.length} msgs, ${finalLength} chars]`);

        return {
            messages: finalizedMessages,
            layers: {
                immediate: finalizedMessages,
                working: { summary: '' },
                persistent: { facts: ragContext?.facts || [], relevantHistory: ragContext?.history || [] }
            },
            wasTruncated: finalizedMessages.length < (messages.length + (contextMessages.length - messages.length)),
            originalCount
        };
    }

    /**
     * Create layered context from full message history
     */
    private createLayeredContext(
        messages: ConversationMessage[],
        conversationId: string,
        originalCount: number,
        layers: ContextLayers
    ): ManagedContext {
        // Deprecated/Unused shim
        return this.prepareContext(messages, conversationId);
    }

    /**
     * Incrementally update summary with new messages
     */
    private updateSummary(olderMessages: ConversationMessage[], conversationId: string): string {
        const lastIndex = this.lastSummarizedIndices.get(conversationId) || 0;
        const currentSummary = this.conversationSummaries.get(conversationId) || '';

        // Calculate how many messages are new since last summary
        if (olderMessages.length <= lastIndex) {
            return currentSummary;
        }

        // Get only the new messages to summarize
        const newMessagesToSummarize = olderMessages.slice(lastIndex);

        if (newMessagesToSummarize.length === 0) {
            return currentSummary;
        }

        // Generate summary for new chunk
        const newChunkSummary = this.summarizeChunk(newMessagesToSummarize);

        // Combine with existing summary
        let updatedSummary = currentSummary;
        if (updatedSummary) {
            updatedSummary += ' ';
        }
        updatedSummary += newChunkSummary;

        // Truncate if absurdly long
        if (updatedSummary.length > 2000) {
            updatedSummary = updatedSummary.substring(updatedSummary.length - 2000);
            updatedSummary = '... ' + updatedSummary.substring(updatedSummary.indexOf(' ') + 1);
        }

        // Update cache
        this.conversationSummaries.set(conversationId, updatedSummary);
        this.lastSummarizedIndices.set(conversationId, olderMessages.length);

        return updatedSummary;
    }

    /**
     * Summarize a chunk of messages
     */
    private summarizeChunk(messages: ConversationMessage[]): string {
        const parts: string[] = [];
        const toolsUsed: Set<string> = new Set();

        for (const msg of messages) {
            // Track tools
            if (msg.toolCalls) {
                msg.toolCalls.forEach(tc => toolsUsed.add(tc.name));
            }

            // Extract user intent
            if (msg.role === 'user') {
                const text = msg.content;
                const summary = text.length > 50 ? text.substring(0, 50) + '...' : text;
                parts.push(`User asked: "${summary}"`);
            }

            // Extract key assistant actions
            if (msg.role === 'assistant' && msg.content.length > 0) {
                if (msg.content.includes('created') || msg.content.includes('wrote')) {
                    parts.push('Assistant created files');
                } else if (msg.content.includes('error')) {
                    parts.push('Assistant encountered error');
                }
            }
        }

        if (toolsUsed.size > 0) {
            parts.push(`Used tools: ${[...toolsUsed].join(', ')}`);
        }

        return parts.join('. ');
    }

    /**
     * Calculate total character length of messages
     */
    private calculateContextLength(messages: ConversationMessage[]): number {
        return messages.reduce((total, msg) => {
            let length = msg.content.length;
            if (msg.toolCalls) {
                length += JSON.stringify(msg.toolCalls).length;
            }
            if (msg.toolResults) {
                length += JSON.stringify(msg.toolResults).length;
            }
            return total + length;
        }, 0);
    }

    /**
     * Smartly prune context to fit within limits
     * Adopts "OpenClaw" strategy:
     * 1. Protect system messages
     * 2. Soft-trim large tool outputs (Head + Tail)
     * 3. Remove oldest messages if still too large
     */
    private pruneContext(messages: ConversationMessage[]): ConversationMessage[] {
        const maxLength = this.options.maxContextLength;
        let currentLength = this.calculateContextLength(messages);

        if (currentLength <= maxLength) return messages;

        // Shallow copy array to allow splicing. Clone objects on modification.
        const result = [...messages];

        // Strategy A: Soft-trim large tool outputs (Head 1000 + Tail 1000)
        // We iterate specifically looking for tool messages or messages with tool results
        for (let i = 0; i < result.length; i++) {
            const msg = result[i];

            // Skip system messages
            if (msg.role === 'system') continue;

            // Check content length
            if (msg.content.length > 2000) {
                // If it's a tool output or just a very large message (likely code/logs)
                // We prefer 1000 chars head and 500 chars tail
                const newMsg = { ...msg };
                const head = msg.content.substring(0, 1000);
                const tail = msg.content.substring(msg.content.length - 1000);

                const originalLen = msg.content.length;
                newMsg.content = `${head}\n... [TRUNCATED ${originalLen - 2000} chars] ...\n${tail}`;
                result[i] = newMsg;

                // Recalculate length savings
                currentLength -= (originalLen - newMsg.content.length);
            }

            // Also check toolResults if present (for 'tool' role or assistant with results)
            if (msg.toolResults) {
                // Currently calculateContextLength stringifies toolResults. 
            }
        }

        if (currentLength <= maxLength) return result;

        // Strategy A2: Aggressive Tool Collapse (Older outputs)
        const protectCount = 100; // INCREASED: Keep last 10 messages (covers about 2-3 interaction turns)
        const protectedIndex = Math.max(0, result.length - protectCount);

        for (let i = 0; i < protectedIndex; i++) {
            const msg = result[i];
            if (msg.role === 'tool' || (msg.toolResults && msg.toolResults.length > 0)) {
                let len = msg.content.length;
                if (msg.toolResults) len += JSON.stringify(msg.toolResults).length;

                if (len > 200) {
                    const newMsg = { ...msg };
                    const originalLen = len;
                    newMsg.content = `[Older Tool Output Pruned]`;
                    if (newMsg.toolResults) {
                        newMsg.toolResults = newMsg.toolResults.map(tr => ({
                            ...tr,
                            result: { status: "pruned", info: "Output hidden to save context" }
                        }));
                    }
                    result[i] = newMsg;

                    let newLen = newMsg.content.length;
                    if (newMsg.toolResults) newLen += JSON.stringify(newMsg.toolResults).length;
                    currentLength -= (originalLen - newLen);
                }
            }
        }

        if (currentLength <= maxLength) return result;

        // Strategy B: Remove messages from the start (preserving System + Protected)
        // Improved to remove PAIRS (Assistant + Tool Results) to maintain API validity.

        while (currentLength > maxLength && result.length > protectCount) {
            // Anchor: Find the last user message to protect it.
            // APIs (like Anthropic/Kiro) require at least one user message.
            const anchorUserMsg = [...result].reverse().find(m => m.role === 'user');

            // Find first non-system message to remove that isn't the anchor
            const indexToRemove = result.findIndex((m, i) =>
                i > 0 &&
                m.role !== 'system' &&
                m !== anchorUserMsg
            );

            if (indexToRemove === -1) break;

            const msg = result[indexToRemove];
            let countToRemove = 1;

            // Check for connections: Remove Assistant + Tool Results together
            if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
                let nextIdx = indexToRemove + 1;
                while (nextIdx < result.length && result[nextIdx].role === 'tool') {
                    countToRemove++;
                    nextIdx++;
                }
            }

            // Remove it
            const removed = result.splice(indexToRemove, countToRemove);

            // Recalculate
            currentLength = this.calculateContextLength(result);
        }

        // EMERGENCY TRUNCATION (Strategy C)
        // If we are STILL over the limit (because protected messages are huge), we must brutally truncate content.
        if (currentLength > maxLength) {
            console.warn(`⚠️ Context still too large (${currentLength} > ${maxLength}) after pruning. Enabling Emergency Truncation.`);

            for (let i = 0; i < result.length; i++) {
                if (currentLength <= maxLength) break;

                const msg = result[i];
                if (msg.role === 'system') continue;

                // Truncate content to 500 chars if it's large
                if (msg.content.length > 500) {
                    const saved = msg.content.length - 500;
                    msg.content = msg.content.substring(0, 500) + `\n... [EMERGENCY TRUNCATED ${saved} chars] ...`;
                    currentLength -= saved;
                }

                // Kill tool results
                if (msg.toolResults) {
                    msg.toolResults = msg.toolResults.map(tr => ({
                        ...tr,
                        result: { status: "pruned", info: "Emergency truncation" }
                    }));
                    // Recalc length (approx)
                    // currentLength = this.calculateContextLength(result); 
                }
            }
        }

        // Final Anchor Check
        // Ensure we have at least one user message
        const hasUser = result.some(m => m.role === 'user');
        if (!hasUser) {
            console.warn('⚠️ No user message found in pruned context. Injecting anchor.');
            // Find original user message if possible, or inject dummy
            const originalUser = messages.find(m => m.role === 'user');
            if (originalUser) {
                result.unshift(originalUser);
            } else {
                result.unshift({ role: 'user', content: 'Context restored.', timestamp: new Date() });
            }
        }

        return result;
    }

    /**
     * Clear cached summary for a conversation
     */
    clearSummary(conversationId: string): void {
        this.conversationSummaries.delete(conversationId);
        this.lastSummarizedIndices.delete(conversationId);
    }

    /**
     * Get cached summary
     */
    getSummary(conversationId: string): string | undefined {
        return this.conversationSummaries.get(conversationId);
    }
}

