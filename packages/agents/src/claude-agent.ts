/**
 * Claude Agent - Anthropic Claude integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, AgentResponse, AgentStreamEvent, AgentOptions } from './base-agent.js';
import type { ConversationMessage, Session } from '@atlas/core';

export class ClaudeAgent extends BaseAgent {
    private client: Anthropic;

    constructor(options: AgentOptions) {
        super(options);
        this.client = new Anthropic({
            apiKey: options.apiKey,
            baseURL: options.baseUrl
        });
    }

    /**
     * Generate a response using Claude
     */
    async generate(
        messages: ConversationMessage[],
        _session: Session
    ): Promise<AgentResponse> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const response = await this.client.messages.create({
            model: this.options.model,
            max_tokens: this.options.maxTokens || 4096,
            system: this.systemPrompt,
            messages: formattedMessages as Anthropic.MessageParam[],
            tools: tools.length > 0 ? tools as Anthropic.Tool[] : undefined
        });

        // Extract text content and tool calls
        let content = '';
        const toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input as Record<string, unknown>
                });
            }
        }

        return {
            content,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            finishReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'stop'
        };
    }

    /**
     * Generate a streaming response using Claude
     */
    async *stream(
        messages: ConversationMessage[],
        _session: Session
    ): AsyncGenerator<AgentStreamEvent> {
        const formattedMessages = this.formatMessagesForProvider(messages);
        const tools = this.formatToolsForProvider();

        const stream = this.client.messages.stream({
            model: this.options.model,
            max_tokens: this.options.maxTokens || 4096,
            system: this.systemPrompt,
            messages: formattedMessages as Anthropic.MessageParam[],
            tools: tools.length > 0 ? tools as Anthropic.Tool[] : undefined
        });

        let currentToolUse: { id: string; name: string; input: string } | null = null;

        for await (const event of stream) {
            if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                    currentToolUse = {
                        id: event.content_block.id,
                        name: event.content_block.name,
                        input: ''
                    };
                }
            } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    yield { type: 'text_delta', content: event.delta.text };
                } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                    currentToolUse.input += event.delta.partial_json;
                }
            } else if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                    try {
                        const args = JSON.parse(currentToolUse.input || '{}');
                        yield {
                            type: 'tool_use',
                            toolCall: {
                                id: currentToolUse.id,
                                name: currentToolUse.name,
                                arguments: args
                            }
                        };
                    } catch {
                        yield { type: 'error', error: 'Failed to parse tool arguments' };
                    }
                    currentToolUse = null;
                }
            } else if (event.type === 'message_stop') {
                yield { type: 'done' };
            }
        }
    }

    /**
     * Format tools for Claude API
     */
    protected formatToolsForProvider(): Anthropic.Tool[] {
        return this.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object' as const,
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        }));
    }

    /**
     * Format messages for Claude API
     */
    protected formatMessagesForProvider(
        messages: ConversationMessage[]
    ): Anthropic.MessageParam[] {
        const formatted: Anthropic.MessageParam[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                // System messages are handled separately in Claude
                continue;
            }

            if (msg.role === 'user') {
                formatted.push({
                    role: 'user',
                    content: msg.content
                });
            } else if (msg.role === 'assistant') {
                const content: Anthropic.ContentBlock[] = [];

                if (msg.content) {
                    content.push({ type: 'text', text: msg.content });
                }

                if (msg.toolCalls) {
                    for (const tc of msg.toolCalls) {
                        content.push({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.name,
                            input: tc.arguments
                        });
                    }
                }

                formatted.push({
                    role: 'assistant',
                    content: content.length === 1 && content[0].type === 'text'
                        ? content[0].text
                        : content
                });
            } else if (msg.role === 'tool' && msg.toolResults) {
                formatted.push({
                    role: 'user',
                    content: msg.toolResults.map((tr: { toolCallId: string; result: unknown; error?: string }) => ({
                        type: 'tool_result' as const,
                        tool_use_id: tr.toolCallId,
                        content: JSON.stringify(tr.result),
                        is_error: !!tr.error
                    }))
                });
            }
        }

        return formatted;
    }
}

