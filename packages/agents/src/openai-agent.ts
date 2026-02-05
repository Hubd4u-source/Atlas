/**
 * OpenAI Agent - GPT integration
 */

import OpenAI from 'openai';
import { BaseAgent, AgentResponse, AgentStreamEvent, AgentOptions } from './base-agent.js';
import type { ConversationMessage, Session } from '@atlas/core';

export class OpenAIAgent extends BaseAgent {
    private client: OpenAI;

    constructor(options: AgentOptions) {
        super(options);
        this.client = new OpenAI({
            apiKey: options.apiKey,
            baseURL: options.baseUrl
        });
    }

    /**
     * Generate a response using OpenAI
     */
    async generate(
        messages: ConversationMessage[],
        _session: Session
    ): Promise<AgentResponse> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const response = await this.client.chat.completions.create({
            model: this.options.model,
            max_tokens: this.options.maxTokens || 4096,
            temperature: this.options.temperature,
            messages: formattedMessages as OpenAI.ChatCompletionMessageParam[],
            tools: tools.length > 0 ? tools as OpenAI.ChatCompletionTool[] : undefined
        });

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
    }

    /**
     * Generate a streaming response using OpenAI
     */
    async *stream(
        messages: ConversationMessage[],
        _session: Session
    ): AsyncGenerator<AgentStreamEvent> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const stream = await this.client.chat.completions.create({
            model: this.options.model,
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
     * Format tools for OpenAI API
     */
    protected formatToolsForProvider(): OpenAI.ChatCompletionTool[] {
        return this.tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters.properties,
                    required: tool.parameters.required
                }
            }
        }));
    }

    /**
     * Format messages for OpenAI API
     */
    protected formatMessagesForProvider(
        messages: ConversationMessage[]
    ): OpenAI.ChatCompletionMessageParam[] {
        const formatted: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: this.systemPrompt }
        ];

        for (const msg of messages) {
            if (msg.role === 'system') {
                // Already handled above
                continue;
            }

            if (msg.role === 'user') {
                formatted.push({
                    role: 'user',
                    content: msg.content
                });
            } else if (msg.role === 'assistant') {
                const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
                    role: 'assistant',
                    content: msg.content || null
                };

                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    assistantMsg.tool_calls = msg.toolCalls.map((tc: { id: string; name: string; arguments: Record<string, unknown> }) => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments)
                        }
                    }));
                }

                formatted.push(assistantMsg);
            } else if (msg.role === 'tool' && msg.toolResults) {
                for (const tr of msg.toolResults) {
                    formatted.push({
                        role: 'tool',
                        tool_call_id: tr.toolCallId,
                        content: JSON.stringify(tr.result)
                    });
                }
            }
        }

        return formatted;
    }
}

