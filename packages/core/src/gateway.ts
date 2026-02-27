/**
 * Gateway - Central WebSocket server for Atlas
 * Handles message routing between channels and agents
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './session.js';
import type {
    IncomingMessage,
    OutgoingMessage,
    GatewayConfig,
    ChannelType,
    MessageContent
} from './types.js';

interface GatewayEvents {
    'message': (message: IncomingMessage, respond: (content: MessageContent) => Promise<void>) => void;
    'channel:connected': (channel: ChannelType) => void;
    'channel:disconnected': (channel: ChannelType) => void;
    'client:connected': (clientId: string) => void;
    'client:disconnected': (clientId: string) => void;
    'raw_message': (message: Record<string, any>, client: Client) => void;
    'error': (error: Error) => void;
}

interface Client {
    id: string;
    ws: WebSocket;
    channel?: ChannelType;
    authenticated: boolean;
}

type ApiRouteHandler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    params: { path: string; body?: unknown; query: Record<string, string> }
) => Promise<void>;

interface ApiRoute {
    method: string;        // GET, POST, DELETE
    pattern: string;       // e.g. /api/cron/jobs or /api/cron/jobs/:id
    handler: ApiRouteHandler;
}

export class Gateway extends EventEmitter<GatewayEvents> {
    private wss: WebSocketServer | null = null;
    private clients: Map<string, Client> = new Map();
    private channelClients: Map<ChannelType, Set<string>> = new Map();
    public sessionManager: SessionManager;
    private config: GatewayConfig;
    private staticDir?: string;
    private staticRoutes: Record<string, string>;
    private apiRoutes: ApiRoute[] = [];

    constructor(
        config: GatewayConfig,
        maxConversationHistory: number = 100,
        staticDir?: string,
        staticRoutes: Record<string, string> = {}
    ) {
        super();
        this.config = config;
        this.sessionManager = new SessionManager(maxConversationHistory);
        this.staticDir = staticDir;
        this.staticRoutes = staticRoutes;
    }

    /**
     * Register an API route on the gateway HTTP server
     */
    registerApiRoute(method: string, pattern: string, handler: ApiRouteHandler): void {
        this.apiRoutes.push({ method: method.toUpperCase(), pattern, handler });
        console.log(`🔌 [API] Registered: ${method.toUpperCase()} ${pattern}`);
    }

    /**
     * Match a URL against registered API routes
     */
    private matchApiRoute(method: string, urlPath: string): { route: ApiRoute; params: Record<string, string> } | null {
        for (const route of this.apiRoutes) {
            if (route.method !== method.toUpperCase()) continue;
            // Simple pattern matching with :param support
            const patternParts = route.pattern.split('/');
            const urlParts = urlPath.split('/');
            if (patternParts.length !== urlParts.length) continue;
            const params: Record<string, string> = {};
            let match = true;
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = urlParts[i];
                } else if (patternParts[i] !== urlParts[i]) {
                    match = false;
                    break;
                }
            }
            if (match) return { route, params };
        }
        return null;
    }

    /**
     * Parse JSON body from request
     */
    private parseBody(req: http.IncomingMessage): Promise<unknown> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => {
                if (chunks.length === 0) { resolve(undefined); return; }
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                } catch {
                    resolve(undefined);
                }
            });
            req.on('error', () => resolve(undefined));
        });
    }

    /**
     * Start the WebSocket server
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const server = http.createServer(async (req, res) => {
                    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

                    const contentTypeFor = (filePath: string) => {
                        const ext = path.extname(filePath).toLowerCase();
                        if (ext === '.html') return 'text/html';
                        if (ext === '.css') return 'text/css';
                        if (ext === '.js') return 'application/javascript';
                        if (ext === '.json') return 'application/json';
                        if (ext === '.mp3') return 'audio/mpeg';
                        if (ext === '.wav') return 'audio/wav';
                        if (ext === '.ogg') return 'audio/ogg';
                        if (ext === '.webm') return 'audio/webm';
                        if (ext === '.png') return 'image/png';
                        if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
                        if (ext === '.svg') return 'image/svg+xml';
                        return 'application/octet-stream';
                    };

                    const tryServeFile = (filePath: string, noCache = false) => {
                        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                            return false;
                        }
                        const headers: Record<string, string> = {
                            'Content-Type': contentTypeFor(filePath)
                        };
                        if (noCache) {
                            headers['Cache-Control'] = 'no-store, max-age=0';
                        }
                        res.writeHead(200, headers);
                        fs.createReadStream(filePath).pipe(res);
                        return true;
                    };

                    // ── API Routes (check before static files) ────────────────
                    const method = (req.method || 'GET').toUpperCase();
                    const matched = this.matchApiRoute(method, urlPath);
                    if (matched) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        try {
                            const body = (method === 'POST' || method === 'PUT' || method === 'DELETE')
                                ? await this.parseBody(req)
                                : undefined;
                            const queryStr = (req.url || '').split('?')[1] || '';
                            const query: Record<string, string> = {};
                            for (const pair of queryStr.split('&')) {
                                const [k, v] = pair.split('=');
                                if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
                            }
                            await matched.route.handler(req, res, {
                                path: urlPath,
                                body,
                                query: { ...query, ...matched.params },
                            });
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: message }));
                        }
                        return;
                    }

                    // CORS preflight
                    if (method === 'OPTIONS') {
                        res.writeHead(204, {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        });
                        res.end();
                        return;
                    }

                    // ── Static Routes ─────────────────────────────────────────
                    if (req.method === 'GET' && Object.keys(this.staticRoutes).length > 0) {
                        for (const [prefixRaw, dir] of Object.entries(this.staticRoutes)) {
                            const prefix = prefixRaw.startsWith('/') ? prefixRaw : `/${prefixRaw}`;
                            if (!urlPath.startsWith(prefix)) continue;

                            const relative = urlPath.slice(prefix.length).replace(/^\/+/, '');
                            if (!relative) {
                                res.writeHead(404, { 'Content-Type': 'text/plain' });
                                res.end('Not Found');
                                return;
                            }

                            const baseDir = path.resolve(dir);
                            const resolved = path.resolve(baseDir, relative);
                            if (!resolved.startsWith(baseDir)) {
                                res.writeHead(403, { 'Content-Type': 'text/plain' });
                                res.end('Forbidden');
                                return;
                            }

                            if (tryServeFile(resolved, true)) {
                                return;
                            }

                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('Not Found');
                            return;
                        }
                    }

                    if (req.method === 'GET' && this.staticDir) {
                        const safePath = urlPath.replace(/\.\./g, '').replace(/\/+$/, '') || '/';
                        const target = safePath === '/'
                            ? 'index.html'
                            : safePath.replace(/^\/+/, '');
                        const filePath = path.join(this.staticDir, target);

                        if (tryServeFile(filePath)) {
                            return;
                        }

                        // Fallback to index.html for SPA
                        const indexPath = path.join(this.staticDir, 'index.html');
                        if (tryServeFile(indexPath)) {
                            return;
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', service: 'Atlas Gateway', version: '0.1.0' }));
                });

                this.wss = new WebSocketServer({ server });

                server.listen(this.config.port, this.config.host, () => {
                    // Listener will be handled by wss.on('listening')? 
                    // No, wss emits listening when server listens.
                });

                this.wss.on('connection', (ws) => this.handleConnection(ws));

                this.wss.on('listening', () => {
                    console.log(`🚀 Gateway listening on ws://${this.config.host}:${this.config.port}`);
                    resolve();
                });

                this.wss.on('error', (error) => {
                    this.emit('error', error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket): void {
        const clientId = uuidv4();
        const client: Client = {
            id: clientId,
            ws,
            authenticated: false
        };

        this.clients.set(clientId, client);
        console.log(`📡 Client connected: ${clientId}`);

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                await this.handleMessage(client, message);
            } catch (error) {
                this.sendError(client, 'Invalid message format');
            }
        });

        ws.on('close', () => {
            this.handleDisconnection(client);
        });

        ws.on('error', (error) => {
            console.error(`Client ${clientId} error:`, error);
            this.emit('error', error);
        });

        // Send welcome message
        this.send(client, {
            type: 'event',
            channel: 'web',
            chatId: '',
            content: { text: 'Connected to Atlas Gateway' },
            status: 'success',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle incoming message from client
     */
    private async handleMessage(client: Client, raw: unknown): Promise<void> {
        const message = raw as Record<string, unknown>;

        // Handle authentication
        if (message.type === 'auth') {
            console.log(`📡 [Gateway] Auth attempt with token: ${message.token}`);
            if (message.token === this.config.auth.token) {
                console.log('✅ [Gateway] Auth successful');
                client.authenticated = true;
                client.channel = message.channel as ChannelType;

                if (client.channel) {
                    if (!this.channelClients.has(client.channel)) {
                        this.channelClients.set(client.channel, new Set());
                    }
                    this.channelClients.get(client.channel)!.add(client.id);
                    this.emit('channel:connected', client.channel);
                }

                this.emit('client:connected', client.id);
                this.send(client, {
                    type: 'response',
                    channel: client.channel || 'web',
                    chatId: '',
                    content: { text: 'Authenticated successfully' },
                    status: 'success',
                    timestamp: new Date().toISOString()
                });
            } else {
                console.warn(`❌ [Gateway] Auth FAILED. Expected: ${this.config.auth.token}, got: ${message.token}`);
                this.sendError(client, 'Invalid authentication token');
            }
            return;
        }

        // Require authentication for other messages
        if (!client.authenticated) {
            this.sendError(client, 'Not authenticated');
            return;
        }

        // Emit all messages for custom handling (like extension responses)
        this.emit('raw_message', message, client);

        // Handle regular messages
        if (message.type === 'message') {
            const incomingMessage = message as unknown as IncomingMessage;

            // Create respond function for this message
            const respond = async (content: MessageContent): Promise<void> => {
                await this.sendToChannel(
                    incomingMessage.channel,
                    incomingMessage.chatId,
                    content
                );
            };

            this.emit('message', incomingMessage, respond);
        }

        // Handle ping/health check
        if (message.type === 'ping') {
            this.send(client, {
                type: 'response',
                channel: client.channel || 'web',
                chatId: '',
                content: { text: 'pong' },
                status: 'success',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handle client disconnection
     */
    private handleDisconnection(client: Client): void {
        console.log(`📴 Client disconnected: ${client.id}`);

        if (client.channel) {
            this.channelClients.get(client.channel)?.delete(client.id);
            if (this.channelClients.get(client.channel)?.size === 0) {
                this.emit('channel:disconnected', client.channel);
            }
        }

        this.clients.delete(client.id);
        this.emit('client:disconnected', client.id);
    }

    /**
     * Send message to a specific client
     */
    private send(client: Client, message: OutgoingMessage): void {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error to client
     */
    private sendError(client: Client, error: string): void {
        this.send(client, {
            type: 'error',
            channel: client.channel || 'web',
            chatId: '',
            content: { text: error },
            status: 'error',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send message to all clients of a specific channel
     */
    async sendToChannel(
        channel: ChannelType,
        chatId: string,
        content: MessageContent
    ): Promise<void> {
        const clientIds = this.channelClients.get(channel);
        if (!clientIds) return;

        const message: OutgoingMessage = {
            type: 'response',
            channel,
            chatId,
            content,
            status: 'success',
            timestamp: new Date().toISOString()
        };

        for (const clientId of clientIds) {
            const client = this.clients.get(clientId);
            if (client) {
                this.send(client, message);
            }
        }
    }

    /**
     * Send raw JSON content to all clients of a channel
     */
    async sendRawToChannel(channel: ChannelType, rawMessage: any): Promise<void> {
        const clientIds = this.channelClients.get(channel);
        if (!clientIds) return;

        for (const clientId of clientIds) {
            const client = this.clients.get(clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(rawMessage));
            }
        }
    }

    /**
     * Broadcast message to all authenticated clients
     */
    broadcast(content: MessageContent): void {
        const message: OutgoingMessage = {
            type: 'event',
            channel: 'web',
            chatId: '',
            content,
            status: 'success',
            timestamp: new Date().toISOString()
        };

        for (const client of this.clients.values()) {
            if (client.authenticated) {
                this.send(client, message);
            }
        }
    }

    /**
     * Stop the gateway server
     */
    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.wss) {
                // Close all client connections
                for (const client of this.clients.values()) {
                    client.ws.close();
                }
                this.clients.clear();
                this.channelClients.clear();

                this.wss.close(() => {
                    console.log('🛑 Gateway stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Get gateway status
     */
    getStatus(): {
        running: boolean;
        clients: number;
        channels: string[];
        sessions: number;
    } {
        return {
            running: this.wss !== null,
            clients: this.clients.size,
            channels: Array.from(this.channelClients.keys()),
            sessions: this.sessionManager.getAllSessions().length
        };
    }
}

