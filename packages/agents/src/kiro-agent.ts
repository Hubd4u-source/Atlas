/**
 * Kiro Agent - Kiro Gateway integration (OpenAI-compatible API)
 * Uses Kiro Gateway for Claude models via AWS CodeWhisperer
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent, AgentResponse, AgentStreamEvent, AgentOptions } from './base-agent.js';
import type { ConversationMessage, Session } from '@atlas/core';

export interface KiroAgentOptions extends AgentOptions {
    proxyApiKey: string; // The PROXY_API_KEY from Kiro Gateway
}

export class KiroAgent extends BaseAgent {
    private client: OpenAI;

    constructor(options: KiroAgentOptions) {
        super(options);
        this.client = new OpenAI({
            apiKey: options.proxyApiKey,
            baseURL: options.baseUrl || 'http://localhost:8000/v1'
        });
    }

    /**
     * Generate a response using Kiro Gateway
     */
    async generate(
        messages: ConversationMessage[],
        _session: Session
    ): Promise<AgentResponse> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const request: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            model: this.options.model || 'claude-sonnet-4-5',
            max_tokens: this.options.maxTokens || 4096,
            messages: formattedMessages as OpenAI.ChatCompletionMessageParam[]
        };

        if (this.options.temperature !== undefined) {
            request.temperature = this.options.temperature;
        }

        // Re-enable tools for debugging
        if (tools.length > 0) {
            request.tools = tools as OpenAI.ChatCompletionTool[];
        }

        try {
            // Debug: Log the first few messages to see format
            const msgCount = request.messages.length;
            const toolCount = request.tools?.length || 0;
            const totalChars = JSON.stringify(request.messages).length;

            console.log(`🤖 Kiro Request: ${msgCount} msgs, ${toolCount} tools, ~${totalChars} context chars`);

            const response = await this.client.chat.completions.create(request);

            const choice = response.choices[0];
            const message = choice.message;

            // Extract tool calls if present
            const toolCalls = message.tool_calls?.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments)
            }));

            return {
                content: message.content || '',
                toolCalls,
                finishReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'stop'
            };
        } catch (error) {
            console.error('Kiro API request failed:', {
                model: this.options.model || 'claude-sonnet-4-5',
                messageCount: formattedMessages.length,
                hasTools: tools.length > 0,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Generate a streaming response using Kiro Gateway
     */
    async *stream(
        messages: ConversationMessage[],
        _session: Session
    ): AsyncGenerator<AgentStreamEvent> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const stream = await this.client.chat.completions.create({
            model: this.options.model || 'claude-sonnet-4-5',
            max_tokens: this.options.maxTokens || 4096,
            temperature: this.options.temperature,
            messages: formattedMessages as OpenAI.ChatCompletionMessageParam[],
            tools: tools.length > 0 ? tools as OpenAI.ChatCompletionTool[] : undefined,
            stream: true
        });

        const toolCallBuilders: Map<number, { id: string; name: string; args: string }> = new Map();

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (!delta) continue;

            // Handle text content
            if (delta.content) {
                yield { type: 'text_delta', content: delta.content };
            }

            // Handle tool calls
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (!toolCallBuilders.has(tc.index)) {
                        toolCallBuilders.set(tc.index, {
                            id: tc.id || '',
                            name: tc.function?.name || '',
                            args: ''
                        });
                    }

                    const builder = toolCallBuilders.get(tc.index)!;

                    if (tc.id) builder.id = tc.id;
                    if (tc.function?.name) builder.name = tc.function.name;
                    if (tc.function?.arguments) builder.args += tc.function.arguments;
                }
            }

            // Check for finish
            if (chunk.choices[0]?.finish_reason) {
                // Emit any completed tool calls
                for (const builder of toolCallBuilders.values()) {
                    try {
                        yield {
                            type: 'tool_use',
                            toolCall: {
                                id: builder.id,
                                name: builder.name,
                                arguments: JSON.parse(builder.args || '{}')
                            }
                        };
                    } catch {
                        yield { type: 'error', error: 'Failed to parse tool arguments' };
                    }
                }

                yield { type: 'done' };
            }
        }
    }

    /**
     * Format tools for OpenAI-compatible API
     */
    protected formatToolsForProvider(): OpenAI.ChatCompletionTool[] {
        return this.tools.map(tool => {
            // STRICT SANITIZATION to prevent 400 errors

            // 1. Sanitize Properties
            let properties = tool.parameters.properties;
            if (!properties || typeof properties !== 'object') {
                properties = {};
            }

            // 2. Sanitize Description
            const description = tool.description
                ? (tool.description.length > 1024 ? tool.description.substring(0, 1021) + '...' : tool.description)
                : 'No description provided';

            // 3. Sanitize Required
            // Ensure strict array, filter out items not in properties (common validation error)
            let required = Array.isArray(tool.parameters.required)
                ? tool.parameters.required
                : [];

            // Only keep required fields that actually exist in properties
            required = required.filter((key: string) => Object.prototype.hasOwnProperty.call(properties, key));

            return {
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: description,
                    parameters: {
                        type: 'object',
                        properties: properties,
                        required: required,
                        additionalProperties: false
                    },
                    strict: true // Enable strict structured outputs
                }
            };
        });
    }

    /**
     * Format messages for OpenAI-compatible API
     */
    protected formatMessagesForProvider(
        messages: ConversationMessage[]
    ): OpenAI.ChatCompletionMessageParam[] {
        // 1. Collect system content
        let systemContent = this.systemPrompt;

        // 2. Linearize and Validate History
        // We need a strict sequence: User -> Assistant -> User -> Assistant...
        // And atomic Tool Chains: (Assistant w/ tools) -> (Tool Result)

        const validHistory: OpenAI.ChatCompletionMessageParam[] = [];

        // Helper to get the last valid role
        const getLastRole = () => validHistory.length > 0 ? validHistory[validHistory.length - 1].role : null;

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemContent += `\n\n${msg.content}`;
                continue;
            }

            if (msg.role === 'user') {
                // Collapse adjacent users? Or just allow them (some APIs allow, Kiro might not).
                // Safest to collapse or join with newline.
                if (getLastRole() === 'user') {
                    const lastMsg = validHistory[validHistory.length - 1] as OpenAI.ChatCompletionUserMessageParam;
                    if (typeof lastMsg.content === 'string') {
                        lastMsg.content += `\n\n${msg.content}`;
                    }
                } else {
                    // Check if this message has an image for vision
                    if (msg.imageUrl || msg.imageData) {
                        console.log(`🖼️ Kiro: Vision content detected, imageUrl=${!!msg.imageUrl}, imageData=${!!msg.imageData}`);

                        // Use content array format for vision
                        const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];

                        // Add text content if present
                        if (msg.content) {
                            contentParts.push({ type: 'text', text: msg.content });
                        }

                        // Add image - prioritize base64 data (Kiro requires base64, not URLs)
                        if (msg.imageData) {
                            const mimeType = msg.imageMimeType || 'image/jpeg';
                            contentParts.push({
                                type: 'image_url',
                                image_url: { url: `data:${mimeType};base64,${msg.imageData}` }
                            });
                        } else if (msg.imageUrl) {
                            // Fallback to URL (may not work with all providers)
                            contentParts.push({
                                type: 'image_url',
                                image_url: { url: msg.imageUrl }
                            });
                        }

                        validHistory.push({ role: 'user', content: contentParts as any });
                    } else {
                        validHistory.push({ role: 'user', content: msg.content || '(empty)' });
                    }
                }
            }

            else if (msg.role === 'assistant') {
                // If last was assistant, collapse?
                // Assistant -> Assistant is usually invalid unless one is tool call and other is text.
                // But Kiro specifically forbids Assistant -> Assistant.
                if (getLastRole() === 'assistant') {
                    // We merge content.
                    const lastMsg = validHistory[validHistory.length - 1] as OpenAI.ChatCompletionAssistantMessageParam;
                    // Merge text content
                    const newContent = msg.content || '';
                    if (lastMsg.content && typeof lastMsg.content === 'string') {
                        lastMsg.content += `\n\n${newContent}`;
                    } else if (newContent) {
                        lastMsg.content = newContent;
                    } // If both null, stays null

                    // Merge tool calls?
                    if (msg.toolCalls) {
                        const existingCalls = lastMsg.tool_calls || [];
                        const newCalls = msg.toolCalls.map((tc: any) => ({
                            id: tc.id,
                            type: 'function' as const,
                            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
                        }));
                        lastMsg.tool_calls = [...existingCalls, ...newCalls];
                    }
                } else {
                    // Normal Assistant push
                    const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
                        role: 'assistant',
                        content: msg.content || null
                    };
                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        assistantMsg.tool_calls = msg.toolCalls.map((tc: any) => ({
                            id: tc.id,
                            type: 'function' as const,
                            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
                        }));
                    }
                    validHistory.push(assistantMsg);
                }
            }

            else if (msg.role === 'tool' && msg.toolResults) {
                // Tool results MUST follow an Assistant message with tool_calls.
                // We check the last message.
                const lastMsg = validHistory[validHistory.length - 1];

                // If last matches (Assistant with tool_calls), we append.
                // If NOT, we drop this tool result (Orphaned).
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.tool_calls) {
                    for (const tr of msg.toolResults) {
                        // Check if this result matches a call in the last message?
                        // Ideally yes, but for now just appending is safer than dropping valid ones.
                        validHistory.push({
                            role: 'tool',
                            tool_call_id: tr.toolCallId,
                            content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result)
                        });
                    }
                } else {
                    console.warn(`⚠️ Dropping orphaned tool result (no preceding assistant call): ${JSON.stringify(msg.toolResults.map((t: any) => t.toolCallId))}`);
                }
            }
        }

        // 3. Post-Validation Logic

        // A. Ensure start with User
        while (validHistory.length > 0 && validHistory[0].role !== 'user') {
            console.warn(`⚠️ Dropping leading ${validHistory[0].role} to satisfy API`);
            validHistory.shift();
        }

        // B. Ensure end state is valid
        // If last message is Assistant with tool_calls, BUT no tool messages follow,
        // it means we haven't executed them yet OR they were pruned.
        // If this is history, they should have been executed.
        // However, we can't delete the tool calls if they influenced the *next* user message.
        // But if the validation above works, we only pushed 'tool' if preceded by 'assistant'.
        // What about 'Assistant' followed by 'User'?
        // If Assistant has tool_calls, the NEXT message MUST be tool.
        // So if we have [..., Assistant(calls), User], that is INVALID.

        // Let's fix gaps.
        const finalizedHistory: OpenAI.ChatCompletionMessageParam[] = [];

        for (let i = 0; i < validHistory.length; i++) {
            const current = validHistory[i];

            if (current.role === 'assistant' && current.tool_calls) {
                // Look ahead. Are the next messages 'tool'?
                let hasToolResults = false;
                if (i + 1 < validHistory.length && validHistory[i + 1].role === 'tool') {
                    hasToolResults = true;
                }

                if (!hasToolResults) {
                    // Invalid state: Assistant called tools but no results follow.
                    // Action: STRIP the tool calls to convert it to a text-only thought.
                    console.warn('⚠️ Stripping unmatched tool_calls from assistant message to prevent 400 error.');

                    const { tool_calls, ...cleanAssistant } = current;
                    // If content is empty/null, we must provide something or drop it.
                    if (!cleanAssistant.content) {
                        cleanAssistant.content = '(thought about using tools)';
                    }
                    finalizedHistory.push(cleanAssistant);
                } else {
                    finalizedHistory.push(current);
                }
            } else {
                finalizedHistory.push(current);
            }
        }

        // C. Safety Fallback
        if (finalizedHistory.length === 0) {
            console.log('⚠️ History empty after filtering. Injecting placeholder User message.');
            finalizedHistory.push({
                role: 'user',
                content: '[System: Continuing previous task. Please proceed.]'
            });
        }

        return [
            { role: 'system', content: systemContent },
            ...finalizedHistory
        ];
    }
}

