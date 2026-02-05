/**
 * Core types for Atlas messaging system
 */

/** Message types for Gateway WebSocket protocol */
export type MessageType = 'message' | 'subscribe' | 'unsubscribe' | 'command';
export type ResponseType = 'response' | 'event' | 'error';
export type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'slack' | 'web';

/** Incoming message from client/channel to Gateway */
export interface IncomingMessage {
    type: MessageType;
    channel: ChannelType;
    chatId: string;
    content: MessageContent;
    metadata?: MessageMetadata;
}

/** Outgoing response from Gateway to client/channel */
export interface OutgoingMessage {
    type: ResponseType;
    channel: ChannelType;
    chatId: string;
    content: MessageContent;
    status: 'success' | 'error';
    timestamp: string;
}

/** Message content supporting multiple formats */
export interface MessageContent {
    text?: string;
    image?: MediaContent;
    audio?: MediaContent;
    video?: MediaContent;
    document?: DocumentContent;
    toolCall?: ToolCall;
    toolResult?: ToolResult;
}

export interface MediaContent {
    url?: string;
    data?: string; // Base64
    mimeType: string;
    filename?: string;
}

export interface DocumentContent {
    url?: string;
    data?: string;
    mimeType: string;
    filename: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    toolCallId: string;
    result: unknown;
    error?: string;
}

/** Message metadata */
export interface MessageMetadata {
    userId?: string;
    username?: string;
    displayName?: string;
    replyToMessageId?: string;
    threadId?: string;
    isGroupChat?: boolean;
    mentionedBot?: boolean;
    [key: string]: unknown;
}

/** Session representing a conversation context */
export interface Session {
    id: string;
    channel: ChannelType;
    chatId: string;
    userId?: string;
    createdAt: Date;
    lastActiveAt: Date;
    context: SessionContext;
}

export interface SessionContext {
    messages: ConversationMessage[];
    userProfile?: UserProfile;
    metadata: Record<string, unknown>;
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    /** Image URL for vision models */
    imageUrl?: string;
    /** Base64 image data for vision models */
    imageData?: string;
    /** Image MIME type */
    imageMimeType?: string;
}

export interface UserProfile {
    id: string;
    name?: string;
    preferences: Record<string, unknown>;
    facts: string[];
}

/** Tool definition for AI agents */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, ParameterSchema>;
        required?: string[];
    };
    handler: (params: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
}

export interface ParameterSchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    enum?: string[];
    items?: ParameterSchema;
}

export interface ToolContext {
    session: Session;
    sendMessage: (content: MessageContent) => Promise<void>;
    sendToExtension?: (message: any) => Promise<void>;
    scheduleTask?: (task: any) => void;
}

/** Gateway configuration */
export interface GatewayConfig {
    port: number;
    host: string;
    auth: {
        token: string;
    };
}

/** Agent configuration */
export interface AgentConfig {
    provider: 'anthropic' | 'openai' | 'kiro' | 'ollama' | 'custom';
    model: string;
    apiKey?: string;
    baseUrl?: string;
}

/** Channel configuration */
export interface ChannelConfig {
    enabled: boolean;
    token?: string;
    [key: string]: unknown;
}

/** Full application config */
export interface AppConfig {
    gateway: GatewayConfig;
    agents: {
        default: string;
        [key: string]: AgentConfig | string;
    };
    channels: Record<string, ChannelConfig>;
    memory: {
        backend: 'json' | 'sqlite';
        maxConversationHistory: number;
    };
    skills: {
        enabled: string[];
    };
    /** Groq API configuration for Whisper transcription */
    groq?: {
        apiKey: string;
        whisperModel?: string;  // default: 'whisper-large-v3-turbo'
    };
    /** Browser automation configuration */
    browser?: {
        enabled?: boolean;
        headless?: boolean;
        noSandbox?: boolean;
        executablePath?: string;
        defaultProfile?: string;
        profiles?: Record<string, {
            cdpPort?: number;
            cdpUrl?: string;
            driver?: 'openclaw' | 'extension';
            color?: string;
        }>;
    };
    /** MCP (Model Context Protocol) configuration */
    mcp?: {
        enabled?: boolean;
        configPath?: string;
    };
}

