export interface GatewayMessage {
    type: string;
    channel?: string;
    chatId?: string;
    content?: any;
    metadata?: any;
    level?: 'info' | 'warn' | 'error' | 'success';
    data?: any;
    token?: string;
    command?: string;
    query?: string;
    limit?: number;
    scope?: 'session' | 'all';
    event?: 'start' | 'delta' | 'end';
    id?: string;
    delta?: string;
    configPath?: string;
}

export interface MetricsData {
    status?: string;
    uptime?: number;
    sessions?: number;
    tasks?: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    text: string;
    timestamp: number;
    audio?: {
        data?: string;
        url?: string;
        mimeType?: string;
        filename?: string;
    };
    image?: {
        data?: string;
        url?: string;
        mimeType?: string;
        filename?: string;
    };
}
