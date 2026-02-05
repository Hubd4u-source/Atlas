/**
 * Base Channel - Abstract class for communication adapters
 */

import { EventEmitter } from 'eventemitter3';
import type {
    ChannelType,
    IncomingMessage,
    MessageContent,
    MessageMetadata
} from '@atlas/core';

export interface ChannelEvents {
    'message': (message: IncomingMessage) => void;
    'connected': () => void;
    'disconnected': () => void;
    'error': (error: Error) => void;
    'clear': (chatId: string) => void;
    'clearcontext': (chatId: string) => void;
    'tasks': (chatId: string) => void;
}

export interface ChannelOptions {
    enabled: boolean;
    token?: string;
    [key: string]: unknown;
}

export abstract class BaseChannel extends EventEmitter<ChannelEvents> {
    protected channelType: ChannelType;
    protected options: ChannelOptions;
    protected isConnected: boolean = false;

    constructor(channelType: ChannelType, options: ChannelOptions) {
        super();
        this.channelType = channelType;
        this.options = options;
    }

    /**
     * Get the channel type
     */
    getType(): ChannelType {
        return this.channelType;
    }

    /**
     * Check if channel is connected
     */
    connected(): boolean {
        return this.isConnected;
    }

    /**
     * Start the channel
     */
    abstract start(): Promise<void>;

    /**
     * Stop the channel
     */
    abstract stop(): Promise<void>;

    /**
     * Send a message to a specific chat
     */
    abstract sendMessage(
        chatId: string,
        content: MessageContent
    ): Promise<void>;

    /**
     * Create an incoming message object
     */
    protected createIncomingMessage(
        chatId: string,
        content: MessageContent,
        metadata?: MessageMetadata
    ): IncomingMessage {
        return {
            type: 'message',
            channel: this.channelType,
            chatId,
            content,
            metadata
        };
    }
}

