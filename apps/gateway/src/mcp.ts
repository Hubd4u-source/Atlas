import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { ParameterSchema, ToolDefinition } from '@atlas/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export type McpServerConfig = {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    disabled?: boolean;
};

export type McpConfigFile = {
    servers?: Record<string, McpServerConfig>;
    mcpServers?: Record<string, McpServerConfig>;
};

export type McpServerStatus = {
    id: string;
    command: string;
    args?: string[];
    connected: boolean;
    toolCount: number;
    error?: string;
};

export type McpStatus = {
    enabled: boolean;
    configPath: string;
    servers: McpServerStatus[];
    toolCount: number;
    lastLoaded?: string;
    error?: string;
};

type McpClientEntry = {
    client: any;
    transport: any;
    tools: any[];
    config: McpServerConfig;
};

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.atlas', 'mcp.json');

const resolveConfigPath = (configPath?: string): string => {
    if (!configPath) return DEFAULT_CONFIG_PATH;
    if (configPath.startsWith('~')) {
        return path.join(os.homedir(), configPath.slice(1));
    }
    if (path.isAbsolute(configPath)) return configPath;
    return path.resolve(process.cwd(), configPath);
};

const normalizeEnv = (env?: Record<string, string>): Record<string, string> => ({
    ...(process.env as Record<string, string>),
    ...(env || {})
});

export class McpManager {
    private clients = new Map<string, McpClientEntry>();
    private status: McpStatus;
    private enabled: boolean;
    private configPath: string;

    constructor(options?: { enabled?: boolean; configPath?: string }) {
        this.enabled = options?.enabled !== false;
        this.configPath = resolveConfigPath(options?.configPath);
        this.status = {
            enabled: this.enabled,
            configPath: this.configPath,
            servers: [],
            toolCount: 0
        };
    }

    public getStatus(): McpStatus {
        return this.status;
    }

    public async loadTools(overridePath?: string): Promise<ToolDefinition[]> {
        if (overridePath) {
            this.configPath = resolveConfigPath(overridePath);
        }

        if (!this.enabled) {
            this.status = {
                enabled: false,
                configPath: this.configPath,
                servers: [],
                toolCount: 0
            };
            await this.disconnectAll();
            return [];
        }

        const { servers, error } = await this.readConfig(this.configPath);
        await this.disconnectAll();

        const tools: ToolDefinition[] = [];
        const serverStatuses: McpServerStatus[] = [];

        const entries = Object.entries(servers);
        for (const [id, config] of entries) {
            if (!config || config.disabled) {
                serverStatuses.push({
                    id,
                    command: config?.command || '',
                    args: config?.args,
                    connected: false,
                    toolCount: 0,
                    error: 'Disabled'
                });
                continue;
            }

            if (!config.command) {
                serverStatuses.push({
                    id,
                    command: '',
                    args: config.args,
                    connected: false,
                    toolCount: 0,
                    error: 'Missing command'
                });
                continue;
            }

            try {
                const transportOptions: any = {
                    command: config.command,
                    args: config.args || [],
                    env: normalizeEnv(config.env)
                };
                if (config.cwd) {
                    transportOptions.cwd = config.cwd;
                }
                const transport = new StdioClientTransport(transportOptions);

                const client = new Client(
                    { name: 'Atlas-gateway', version: '0.1.0' },
                    { capabilities: {} }
                );

                await client.connect(transport);
                const list = await client.listTools();
                const serverTools = list?.tools || [];

                this.clients.set(id, {
                    client,
                    transport,
                    tools: serverTools,
                    config
                });

                serverStatuses.push({
                    id,
                    command: config.command,
                    args: config.args,
                    connected: true,
                    toolCount: serverTools.length
                });

                for (const tool of serverTools) {
                    tools.push(this.buildToolDefinition(id, tool));
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                serverStatuses.push({
                    id,
                    command: config.command,
                    args: config.args,
                    connected: false,
                    toolCount: 0,
                    error: message
                });
            }
        }

        this.status = {
            enabled: this.enabled,
            configPath: this.configPath,
            servers: serverStatuses,
            toolCount: tools.length,
            lastLoaded: new Date().toISOString(),
            error
        };

        return tools;
    }

    public async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
        const entry = this.clients.get(serverId);
        if (!entry?.client) {
            throw new Error(`MCP server "${serverId}" is not connected`);
        }
        return await entry.client.callTool({ name: toolName, arguments: args });
    }

    public async shutdown(): Promise<void> {
        await this.disconnectAll();
    }

    private buildToolDefinition(serverId: string, tool: any): ToolDefinition {
        const name = `mcp.${serverId}.${tool.name}`;
        const description = `[MCP:${serverId}] ${tool.description || 'MCP tool'}`;
        const parameters = this.toToolParameters(tool.inputSchema);
        return {
            name,
            description,
            parameters,
            handler: async (params) => this.callTool(serverId, tool.name, params)
        };
    }

    private toToolParameters(schema: any): ToolDefinition['parameters'] {
        if (!schema || schema.type !== 'object') {
            return { type: 'object', properties: {} };
        }

        const properties: Record<string, ParameterSchema> = {};
        const rawProps = schema.properties || {};
        for (const [key, value] of Object.entries(rawProps)) {
            properties[key] = this.toParameterSchema(value as any);
        }

        const required = Array.isArray(schema.required)
            ? schema.required.filter((item: unknown) => typeof item === 'string') as string[]
            : undefined;

        return {
            type: 'object',
            properties,
            required
        };
    }

    private toParameterSchema(schema: any): ParameterSchema {
        const typeValue = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
        const description = schema?.description || '';

        if (typeValue === 'string' || typeValue === 'number' || typeValue === 'boolean') {
            return {
                type: typeValue,
                description,
                enum: Array.isArray(schema?.enum) ? schema.enum : undefined
            };
        }

        if (typeValue === 'array') {
            return {
                type: 'array',
                description,
                items: schema?.items ? this.toParameterSchema(schema.items) : { type: 'string', description: 'Item' }
            };
        }

        if (typeValue === 'object') {
            return {
                type: 'object',
                description
            };
        }

        return {
            type: 'string',
            description
        };
    }

    private async readConfig(configPath: string): Promise<{ servers: Record<string, McpServerConfig>; error?: string }> {
        try {
            const raw = await fs.readFile(configPath, 'utf-8');
            const parsed = JSON.parse(raw) as McpConfigFile;
            const servers = {
                ...(parsed.mcpServers || {}),
                ...(parsed.servers || {})
            };
            return { servers };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { servers: {}, error: message };
        }
    }

    private async disconnectAll() {
        for (const entry of this.clients.values()) {
            try {
                await entry.client?.close?.();
            } catch {
                // ignore
            }
            try {
                await entry.transport?.close?.();
            } catch {
                // ignore
            }
        }
        this.clients.clear();
    }
}



