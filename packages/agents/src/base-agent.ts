/**
 * Base Agent - Abstract class for AI provider integrations
 */

import type {
    ConversationMessage,
    ToolDefinition,
    ToolCall,
    ToolResult,
    Session,
    ToolContext
} from '@atlas/core';

export interface AgentResponse {
    content: string;
    toolCalls?: ToolCall[];
    finishReason: 'stop' | 'tool_use' | 'max_tokens' | 'error';
}

export interface AgentStreamEvent {
    type: 'text_delta' | 'tool_use' | 'done' | 'error';
    content?: string;
    toolCall?: ToolCall;
    error?: string;
}

export interface AgentOptions {
    model: string;
    apiKey: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
}

export abstract class BaseAgent {
    protected options: AgentOptions;
    protected tools: ToolDefinition[] = [];
    protected systemPrompt: string;

    constructor(options: AgentOptions) {
        this.options = options;
        this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
    }

    /**
     * Default system prompt for the assistant
     */
    protected getDefaultSystemPrompt(): string {
        return `You are Atlas, a powerful agentic AI assistant. Atlas is strong, reliable, and carries the weight of complex tasks. You help users accomplish tasks by using tools effectively.

## Core Principles
- **Be proactive**: Anticipate what tools you'll need and use them
- **Be thorough**: Complete tasks fully, don't stop halfway
- **Be accurate**: Verify your work by reading files after writing them
- **Be helpful**: Explain what you're doing and why

## Tool Usage Guidelines
- Use tools to accomplish tasks - don't just describe what you would do
- Chain multiple tools together to complete complex tasks
- If a task requires creating files, use write_file
- If you need to run commands, use run_command
- Always verify your work (e.g., read_file after write_file)

## Visual Verification
- You can show your work visually using the \`verification\` skill.
- After building a website or app, use \`visual_verify_site\` to automatically open it, take a screenshot, and record a walkthrough video.
- Always prefer high-level verification tools over manual steps for visual walkthroughs.

## Response Style
- Start with a brief plan for complex tasks
- Execute the plan using tools
- Summarize what was accomplished
- Keep responses concise but informative
- **Always confirm visually** if you've built something the user can see.

## Context
- You're talking to the user via a messaging platform
- Remember previous messages in the conversation
- Be conversational but efficient`;
    }

    /**
     * Register tools the agent can use
     */
    registerTools(tools: ToolDefinition[]): void {
        this.tools = tools;
    }

    /**
     * Get registered tools
     */
    getTools(): ToolDefinition[] {
        return this.tools;
    }

    /**
     * Generate a response (non-streaming)
     */
    abstract generate(
        messages: ConversationMessage[],
        session: Session
    ): Promise<AgentResponse>;

    /**
     * Generate a streaming response
     */
    abstract stream(
        messages: ConversationMessage[],
        session: Session
    ): AsyncGenerator<AgentStreamEvent>;

    /**
     * Execute a tool call
     */
    async executeTool(
        toolCall: ToolCall,
        session: Session,
        sendMessage?: (content: string | import('@atlas/core').MessageContent) => Promise<void>,
        sendToExtension?: (message: any) => Promise<void>,
        scheduleTask?: (task: any) => void,
        cancelScheduledTask?: (id: string) => void
    ): Promise<ToolResult> {
        const tool = this.tools.find(t => t.name === toolCall.name);

        if (!tool) {
            return {
                toolCallId: toolCall.id,
                result: null,
                error: `Tool not found: ${toolCall.name} `
            };
        }

        try {
            const result = await tool.handler(toolCall.arguments, {
                session,
                sendMessage: async (content: any) => {
                    if (sendMessage) {
                        await sendMessage(content);
                    }
                },
                sendToExtension,
                scheduleTask,
                cancelScheduledTask
            });

            return {
                toolCallId: toolCall.id,
                result: this.safeToolResult(result)
            };
        } catch (error) {
            return {
                toolCallId: toolCall.id,
                result: null,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Safely format tool result to avoid context overflow
     */
    protected safeToolResult(result: unknown): unknown {
        const MAX_OUTPUT_SIZE = 50000; // 50KB

        if (result === null || result === undefined) return result;

        try {
            // If it's a string
            if (typeof result === 'string') {
                if (result.length <= MAX_OUTPUT_SIZE) return result;
                return `[Output truncated - Result too large (${result.length} chars). First ${MAX_OUTPUT_SIZE} chars]:\n${result.substring(0, MAX_OUTPUT_SIZE)}...`;
            }

            // If it's an object/array, stringify first to check size
            const stringified = JSON.stringify(result);
            if (stringified.length <= MAX_OUTPUT_SIZE) return result;

            // If it's an object with specific large fields (common payload pattern)
            if (typeof result === 'object' && !Array.isArray(result)) {
                // Try to preserve structure but truncate known large fields
                const safeObj = { ...result } as any;
                let modified = false;

                // Common large fields
                ['content', 'data', 'text', 'source', 'stdout', 'stderr'].forEach(key => {
                    if (typeof safeObj[key] === 'string' && safeObj[key].length > 1000) {
                        safeObj[key] = `[${key} truncated - ${safeObj[key].length} chars] ${safeObj[key].substring(0, 1000)}...`;
                        modified = true;
                    }
                });

                if (modified) {
                    // Check if it's small enough now
                    if (JSON.stringify(safeObj).length <= MAX_OUTPUT_SIZE) return safeObj;
                }
            }

            // Fallback: simple string truncation of the JSON
            return `[Output truncated - JSON too large (${stringified.length} chars). First ${MAX_OUTPUT_SIZE} chars]:\n${stringified.substring(0, MAX_OUTPUT_SIZE)}...`;

        } catch (e) {
            return String(result).substring(0, MAX_OUTPUT_SIZE);
        }
    }

    /**
     * Convert tools to provider-specific format
     */
    protected abstract formatToolsForProvider(): unknown[];

    /**
     * Convert messages to provider-specific format
     */
    protected abstract formatMessagesForProvider(
        messages: ConversationMessage[]
    ): unknown[];
}

