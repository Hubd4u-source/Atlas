/**
 * Memory retrieval tools
 */

import type { ToolDefinition } from '@atlas/core';
import type { OpenClawMemory, EpisodicMemory, EpisodeType } from '@atlas/memory';

let memoryManager: OpenClawMemory | null = null;
let episodicMemory: EpisodicMemory | null = null;

export const setMemoryManager = (manager: OpenClawMemory) => {
    memoryManager = manager;
};

export const setEpisodicMemory = (memory: EpisodicMemory) => {
    episodicMemory = memory;
};

export const searchMemoryTool: ToolDefinition = {
    name: 'search_memory',
    description: 'Search through past conversations and user facts using semantic search. Use this when you need to recall something discussed previously.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query to find relevant memories'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 5)'
            }
        },
        required: ['query']
    },
    handler: async (args) => {
        if (!memoryManager) {
            return { error: 'Memory manager not initialized' };
        }

        const { query, limit = 5 } = args as { query: string, limit?: number };

        try {
            const results = await memoryManager.search(query, limit);

            if (results.length === 0) {
                return { result: 'No relevant memories found.' };
            }

            return {
                result: `Found ${results.length} relevant memories`,
                memories: results.map((r: any) => ({
                    content: r.snippet || r.content,
                    relevance: `${(r.score * 100).toFixed(0)}%`,
                    type: r.metadata?.user_id ? 'fact' : 'message'
                }))
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const rememberFactTool: ToolDefinition = {
    name: 'remember_fact',
    description: 'Store a user fact for long-term memory (e.g., name, preferences). Use this when the user states a durable fact.',
    parameters: {
        type: 'object',
        properties: {
            fact: {
                type: 'string',
                description: 'The fact to remember (e.g., "User name is Alex")'
            },
            userId: {
                type: 'string',
                description: 'Optional user ID override (defaults to current user)'
            }
        },
        required: ['fact']
    },
    handler: async (args, context) => {
        if (!memoryManager) {
            return { success: false, error: 'Memory manager not initialized' };
        }

        const { fact, userId } = args as { fact: string; userId?: string };
        const targetUser = userId || context.session.userId || context.session.chatId;
        await memoryManager.addFact(targetUser, fact);

        return { success: true, message: 'Fact stored', userId: targetUser, fact };
    }
};

export const listFactsTool: ToolDefinition = {
    name: 'list_facts',
    description: 'List stored facts for the current user.',
    parameters: {
        type: 'object',
        properties: {
            userId: {
                type: 'string',
                description: 'Optional user ID override'
            }
        }
    },
    handler: async (args, context) => {
        if (!memoryManager) {
            return { success: false, error: 'Memory manager not initialized' };
        }

        const { userId } = args as { userId?: string };
        const targetUser = userId || context.session.userId || context.session.chatId;
        const facts = await memoryManager.recall(context.session.channel, context.session.chatId, '', targetUser);
        return { success: true, userId: targetUser, facts: facts.userFacts };
    }
};

// ============================================================================
// EPISODIC MEMORY TOOLS
// ============================================================================

export const rememberEpisodeTool: ToolDefinition = {
    name: 'remember_episode',
    description: `Store a learning from the current experience. Use this after:
- Completing a task (success or failure)
- Receiving user feedback
- Fixing an error (remember the solution)
- Learning a user preference or pattern

This helps you become smarter over time by remembering what worked and what didn't.`,
    parameters: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['task_success', 'task_failure', 'user_feedback', 'error_resolved', 'pattern_learned'],
                description: 'Type of episode'
            },
            summary: {
                type: 'string',
                description: 'Brief description of what happened (1-2 sentences)'
            },
            context: {
                type: 'string',
                description: 'What was the situation or task?'
            },
            outcome: {
                type: 'string',
                description: 'What was the result?'
            },
            learning: {
                type: 'string',
                description: 'Key takeaway to remember for next time'
            },
            importance: {
                type: 'number',
                description: 'How important is this to remember? (1-10, default 5)'
            }
        },
        required: ['type', 'summary', 'context', 'outcome']
    },
    handler: async (args) => {
        if (!episodicMemory) {
            return { error: 'Episodic memory not initialized' };
        }

        const params = args as {
            type: EpisodeType;
            summary: string;
            context: string;
            outcome: string;
            learning?: string;
            importance?: number;
        };

        try {
            const episode = await episodicMemory.remember({
                type: params.type,
                summary: params.summary,
                context: params.context,
                outcome: params.outcome,
                learning: params.learning,
                importance: params.importance ?? 5
            });

            return {
                success: true,
                message: `Episode remembered: ${params.summary}`,
                episodeId: episode.id
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const recallEpisodesTool: ToolDefinition = {
    name: 'recall_episodes',
    description: `Search for similar past experiences/episodes. Use this when:
- Starting a task similar to one you've done before
- Encountering an error you might have seen before
- Wanting to remember what worked in similar situations`,
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query describing the current situation'
            },
            limit: {
                type: 'number',
                description: 'Maximum episodes to return (default: 5)'
            }
        },
        required: ['query']
    },
    handler: async (args) => {
        if (!episodicMemory) {
            return { error: 'Episodic memory not initialized' };
        }

        const { query, limit = 5 } = args as { query: string; limit?: number };

        try {
            const results = await episodicMemory.recall(query, limit);

            if (results.length === 0) {
                return {
                    result: 'No similar episodes found.',
                    episodes: []
                };
            }

            return {
                result: `Found ${results.length} similar episodes`,
                episodes: results.map(r => ({
                    type: r.episode.type,
                    summary: r.episode.summary,
                    outcome: r.episode.outcome,
                    learning: r.episode.learning,
                    importance: r.episode.importance,
                    date: r.episode.timestamp.toISOString().split('T')[0]
                }))
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const getLearningsTool: ToolDefinition = {
    name: 'get_learnings',
    description: 'Get your most important learnings and patterns. Use this to refresh your memory on key things you have learned.',
    parameters: {
        type: 'object',
        properties: {
            minImportance: {
                type: 'number',
                description: 'Minimum importance level (1-10, default 7)'
            },
            limit: {
                type: 'number',
                description: 'Maximum learnings to return (default: 10)'
            }
        }
    },
    handler: async (args) => {
        if (!episodicMemory) {
            return { error: 'Episodic memory not initialized' };
        }

        const { minImportance = 7, limit = 10 } = args as { minImportance?: number; limit?: number };

        try {
            const episodes = await episodicMemory.getImportant(minImportance, limit);

            if (episodes.length === 0) {
                return {
                    result: 'No high-importance learnings yet.',
                    learnings: []
                };
            }

            return {
                result: `Found ${episodes.length} key learnings`,
                learnings: episodes.map(e => ({
                    type: e.type,
                    summary: e.summary,
                    learning: e.learning,
                    importance: e.importance
                }))
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const memoryTools: ToolDefinition[] = [
    searchMemoryTool,
    rememberFactTool,
    listFactsTool,
    rememberEpisodeTool,
    recallEpisodesTool,
    getLearningsTool
];


