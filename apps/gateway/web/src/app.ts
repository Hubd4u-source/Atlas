import { GatewayMessage, MetricsData, ChatMessage } from './types.js';

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text: string, query: string): string => {
    const safeText = escapeHtml(text);
    const terms = query.split(/\s+/).map(t => t.trim()).filter(Boolean);
    if (terms.length === 0) return safeText;
    const pattern = terms.map(escapeRegExp).join('|');
    if (!pattern) return safeText;
    const regex = new RegExp(`(${pattern})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
};

const renderMarkdown = (text: string): string => {

    const w = window as any;
    const marked = w?.marked;
    const dompurify = w?.DOMPurify;

    if (marked && typeof marked.parse === 'function') {
        const html = marked.parse(text, { gfm: true, breaks: true });
        return dompurify ? dompurify.sanitize(html) : html;
    }

    // Fallback: escape + preserve line breaks
    return escapeHtml(text).replace(/\n/g, '<br />');
};

const getStoredChatId = (): string => {
    const stored = localStorage.getItem('atlas_web_chat_id')
        || localStorage.getItem('atlas_chat_id')
        || localStorage.getItem('ag_web_chat_id')
        || localStorage.getItem('ag_chat_id')
        || '';
    if (stored) return stored;
    return 'default';
};

class NavigationManager {
    private views: Map<string, HTMLElement> = new Map();
    private links: NodeListOf<Element>;

    constructor() {
        this.links = document.querySelectorAll('.nav-item');

        // Define views
        const dashboard = document.getElementById('view-dashboard');
        const chat = document.getElementById('view-chat');
        const tasks = document.getElementById('view-tasks');
        const memory = document.getElementById('view-memory');
        const settings = document.getElementById('view-settings');

        if (dashboard) this.views.set('Dashboard', dashboard);
        if (chat) this.views.set('Chat', chat);
        if (tasks) this.views.set('Tasks', tasks);
        if (memory) this.views.set('Memory', memory);
        if (settings) this.views.set('Settings', settings);

        this.bindEvents();
    }

    private bindEvents() {
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Stop URL hash change
                const title = link.getAttribute('title');
                if (title) this.navigate(title, link);
            });
        });
    }

    public navigate(viewName: string, activeLink?: Element) {
        // Handle Sidebar State
        if (activeLink) {
            this.links.forEach(l => l.classList.remove('active'));
            activeLink.classList.add('active');
        }

        // Handle View Switching
        this.views.forEach((el, name) => {
            if (name === viewName || (viewName === 'Dashboard' && name === 'Dashboard')) {
                el.style.display = 'block'; // Or 'grid' for dashboard if needed, but 'block' works if child is grid
                if (name === 'Dashboard') {
                    // Ensure grid layout is respected?
                    // Actually simplest is just show/hide
                    el.style.display = ''; // Reset to default (block/grid from CSS)
                    el.classList.add('active');
                } else {
                    el.style.display = 'block';
                }
            } else {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        });

        // Specific Hack for Dashboard Grid which needs display: block container or just be visible
        const dashboard = this.views.get('Dashboard');
        if (dashboard && viewName === 'Dashboard') {
            dashboard.style.display = 'block';
        }
    }
}


class GatewayManager {
    private socket: WebSocket | null = null;
    private reconnectTimer: any = null;
    public isConnected: boolean = false;
    private manualDisconnect = false;
    private config = {
        url: 'ws://localhost:18789',
        token: 'your-secure-gateway-token'
    };

    constructor(private ui: UIManager, private chat: ChatManager, private tasks?: TasksManager) { }

    public connect(url?: string, token?: string) {
        if (this.socket) {
            this.socket.close();
        }

        this.manualDisconnect = false;
        if (url) this.config.url = url;
        if (token) this.config.token = token;

        this.ui.log(`Connecting to ${this.config.url}...`, 'info');
        this.ui.updateStatus('Connecting...');

        try {
            this.socket = new WebSocket(this.config.url);

            this.socket.onopen = () => {
                this.isConnected = true;
                this.ui.updateStatus('Connected', true);
                this.ui.log('Gateway connection established.', 'success');
                this.tasks?.requestUpdate();

                // Authenticate
                this.send({
                    type: 'auth',
                    token: this.config.token,
                    channel: 'web'
                });
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error('Failed to parse message', e);
                }
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.ui.updateStatus('Disconnected', false);
                this.ui.log('Connection lost.', 'warn');
                if (!this.manualDisconnect) {
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = (err) => {
                console.error('Socket error', err);
                this.ui.log('Connection error.', 'error');
            };

        } catch (e: any) {
            this.ui.log('Failed to create WebSocket: ' + e.message, 'error');
        }
    }

    public send(message: GatewayMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    public disconnect() {
        this.manualDisconnect = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.ui.updateStatus('Disconnected', false);
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private handleMessage(message: GatewayMessage) {
        // Handle incoming messages
        console.log('Gateway Message:', message);

        if (message.type === 'event' && message.content?.text === 'Connected to Atlas Gateway') {
            return;
        }

        if (message.type === 'stream') {
            const streamId = message.id || '';
            if (!streamId) return;
            if (message.event === 'start') {
                this.chat.startStream(streamId);
            } else if (message.event === 'delta') {
                this.chat.appendStream(streamId, message.delta || '');
            } else if (message.event === 'end') {
                this.chat.endStream(streamId);
            }
            return;
        }

        if (message.type === 'search_results') {
            const query = (message as any).query || '';
            const results = (message as any).results || [];
            const scope = (message as any).scope as 'session' | 'all' | undefined;
            this.chat.handleSearchResults({ query, results, scope });
            return;
        }

        if (message.type === 'tasks_status') {
            const data = (message as any).data as TaskStatusPayload | undefined;
            if (data) {
                this.tasks?.handleStatus(data);
            }
            return;
        }

        if (message.type === 'mcp_status') {
            const data = (message as any).data as McpStatusPayload | undefined;
            if (data) {
                this.ui.updateMcpStatus(data);
            }
            return;
        }

        if (message.type === 'response' && message.content?.text === 'Authenticated successfully') {
            this.ui.log('Authentication successful.', 'success');
            this.ui.requestMcpStatus(this);
        } else if (message.type === 'response' || message.type === 'event') {
            // Handle regular chat response or event
            if (message.content && message.content.audio) {
                this.chat.addMessage({
                    id: Date.now().toString(),
                    role: 'agent',
                    text: message.content.text || 'Voice message',
                    timestamp: Date.now(),
                    audio: message.content.audio
                });
            } else if (message.content && message.content.text) {
                this.chat.addMessage({
                    id: Date.now().toString(),
                    role: 'agent',
                    text: message.content.text,
                    timestamp: Date.now()
                });
            }
        } else if (message.type === 'error') {
            this.ui.log(message.content?.text || 'Unknown error', 'error');
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected) {
                this.ui.log('Attempting to reconnect...', 'info');
                this.connect();
            }
        }, 5000);
    }
}

class UIManager {
    private els: {
        status: HTMLElement | null;
        dot: HTMLElement | null;
        metricStatus: HTMLElement | null;
        metricUptime: HTMLElement | null;
        metricSessions: HTMLElement | null;
        logs: HTMLElement | null;
        urlInputs: HTMLInputElement[];
        tokenInputs: HTMLInputElement[];
        chatIdInputs: HTMLInputElement[];
        connectButtons: HTMLButtonElement[];
        disconnectButtons: HTMLButtonElement[];
        mcpConfigInputs: HTMLInputElement[];
        mcpReloadButtons: HTMLButtonElement[];
        mcpStatusButtons: HTMLButtonElement[];
        mcpServersCount: HTMLElement | null;
        mcpToolsCount: HTMLElement | null;
        mcpLastRefresh: HTMLElement | null;
        mcpServerList: HTMLElement | null;
        mcpStatusMessage: HTMLElement | null;
    };
    private startTime: number;

    constructor() {
        this.els = {
            status: document.getElementById('connection-status'),
            dot: document.getElementById('connection-dot'),
            metricStatus: document.getElementById('metric-status'),
            metricUptime: document.getElementById('metric-uptime'),
            metricSessions: document.getElementById('metric-sessions'),
            logs: document.getElementById('logs-container'),
            urlInputs: Array.from(document.querySelectorAll('[data-gateway-url], #gateway-url')) as HTMLInputElement[],
            tokenInputs: Array.from(document.querySelectorAll('[data-gateway-token], #gateway-token, #auth-token')) as HTMLInputElement[],
            chatIdInputs: Array.from(document.querySelectorAll('[data-chat-id], #chat-id')) as HTMLInputElement[],
            connectButtons: Array.from(document.querySelectorAll('[data-connect-btn], #connect-btn')) as HTMLButtonElement[],
            disconnectButtons: Array.from(document.querySelectorAll('[data-disconnect-btn], #disconnect-btn')) as HTMLButtonElement[],
            mcpConfigInputs: Array.from(document.querySelectorAll('[data-mcp-config]')) as HTMLInputElement[],
            mcpReloadButtons: Array.from(document.querySelectorAll('[data-mcp-reload]')) as HTMLButtonElement[],
            mcpStatusButtons: Array.from(document.querySelectorAll('[data-mcp-status]')) as HTMLButtonElement[],
            mcpServersCount: document.querySelector('[data-mcp-servers-count]'),
            mcpToolsCount: document.querySelector('[data-mcp-tools-count]'),
            mcpLastRefresh: document.querySelector('[data-mcp-last-refresh]'),
            mcpServerList: document.querySelector('[data-mcp-server-list]'),
            mcpStatusMessage: document.querySelector('[data-mcp-status-message]')
        };

        this.startTime = Date.now();
        this.startUptimeClock();
        this.prefillConnectionInputs();
    }

    public bindEvents(gateway: GatewayManager) {
        this.els.connectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.closest('[data-connection-panel]') || document;
                const urlInput = panel.querySelector('[data-gateway-url]') as HTMLInputElement | null
                    || this.els.urlInputs[0];
                const tokenInput = panel.querySelector('[data-gateway-token]') as HTMLInputElement | null
                    || this.els.tokenInputs[0];
                const chatIdInput = panel.querySelector('[data-chat-id]') as HTMLInputElement | null
                    || this.els.chatIdInputs[0];

                const url = urlInput?.value?.trim() || '';
                const token = tokenInput?.value?.trim() || '';
                const chatId = chatIdInput?.value?.trim() || '';

                if (url) {
                    this.persistConnection(url, token, chatId);
                }
                gateway.connect(url, token);
            });
        });

        this.els.disconnectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                gateway.disconnect();
            });
        });

        this.els.mcpReloadButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.requestMcpReload(gateway);
            });
        });

        this.els.mcpStatusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.requestMcpStatus(gateway);
            });
        });
    }

    public updateStatus(text: string, connected?: boolean) {
        if (this.els.status) this.els.status.textContent = text;
        if (this.els.metricStatus) this.els.metricStatus.textContent = text;

        if (connected === true) {
            this.els.dot?.classList.add('connected');
            this.els.metricStatus?.classList.add('text-success');
        } else if (connected === false) {
            this.els.dot?.classList.remove('connected');
            this.els.metricStatus?.classList.remove('text-success');
        }
    }

    public updateMetrics(data: MetricsData) {
        if (data.sessions !== undefined && this.els.metricSessions) {
            this.els.metricSessions.textContent = data.sessions.toString();
        }
    }

    public requestMcpStatus(gateway: GatewayManager) {
        if (!this.hasMcpUi()) return;
        if (!gateway.isConnected) {
            this.log('Gateway disconnected. Connect to fetch MCP status.', 'warn');
            return;
        }
        gateway.send({
            type: 'command',
            command: 'mcp_status',
            channel: 'web',
            chatId: getStoredChatId()
        });
    }

    public requestMcpReload(gateway: GatewayManager) {
        if (!this.hasMcpUi()) return;
        if (!gateway.isConnected) {
            this.log('Gateway disconnected. Connect to reload MCP.', 'warn');
            return;
        }
        const configPath = this.els.mcpConfigInputs[0]?.value?.trim() || undefined;
        if (configPath) {
            localStorage.setItem('atlas_mcp_config_path', configPath);
        }
        gateway.send({
            type: 'command',
            command: 'mcp_reload',
            channel: 'web',
            chatId: getStoredChatId(),
            configPath
        } as any);
    }

    public updateMcpStatus(status: McpStatusPayload) {
        if (!this.hasMcpUi()) return;

        if (status.configPath) {
            this.els.mcpConfigInputs.forEach(input => {
                if (!input.value) input.value = status.configPath || '';
            });
        }

        if (this.els.mcpServersCount) {
            this.els.mcpServersCount.textContent = String(status.servers?.length || 0);
        }
        if (this.els.mcpToolsCount) {
            this.els.mcpToolsCount.textContent = String(status.toolCount || 0);
        }
        if (this.els.mcpLastRefresh) {
            this.els.mcpLastRefresh.textContent = status.lastLoaded
                ? new Date(status.lastLoaded).toLocaleString()
                : '--';
        }

        if (this.els.mcpStatusMessage) {
            const message = status.enabled
                ? (status.error ? `Error: ${status.error}` : 'MCP ready')
                : 'MCP disabled';
            if (this.els.mcpStatusMessage instanceof HTMLInputElement) {
                this.els.mcpStatusMessage.value = message;
            } else {
                this.els.mcpStatusMessage.textContent = message;
            }
        }

        const list = this.els.mcpServerList;
        if (!list) return;
        list.innerHTML = '';

        if (!status.enabled) {
            const empty = document.createElement('div');
            empty.className = 'mcp-empty';
            empty.textContent = 'MCP disabled in configuration.';
            list.appendChild(empty);
            return;
        }

        if (status.error) {
            const err = document.createElement('div');
            err.className = 'mcp-empty';
            err.textContent = status.error;
            list.appendChild(err);
        }

        if (!status.servers || status.servers.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'mcp-empty';
            empty.textContent = 'No MCP servers configured.';
            list.appendChild(empty);
            return;
        }

        status.servers.forEach(server => {
            const row = document.createElement('div');
            row.className = `mcp-server ${server.connected ? 'connected' : 'disconnected'}`;
            const args = server.args && server.args.length ? ` ${server.args.join(' ')}` : '';
            const command = `${server.command}${args}`;
            row.innerHTML = `
                <div class="mcp-server-top">
                    <span class="mcp-server-name">${escapeHtml(server.id)}</span>
                    <span class="mcp-pill ${server.connected ? 'ok' : 'bad'}">
                        ${server.connected ? 'Connected' : 'Offline'}
                    </span>
                </div>
                <div class="mcp-server-meta">${escapeHtml(command)}</div>
                <div class="mcp-server-meta">Tools: ${escapeHtml(String(server.toolCount || 0))}</div>
                ${server.error ? `<div class="mcp-error">${escapeHtml(server.error)}</div>` : ''}
            `;
            list.appendChild(row);
        });
    }

    public log(message: string, level: string = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const time = new Date().toLocaleTimeString();
        const levelClass = level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'info');

        entry.innerHTML = `<span class="time">${time}</span> <span class="${levelClass}">${message}</span>`;
        this.els.logs?.appendChild(entry);
        if (this.els.logs) this.els.logs.scrollTop = this.els.logs.scrollHeight;
    }

    private hasMcpUi(): boolean {
        return Boolean(this.els.mcpServerList || this.els.mcpServersCount || this.els.mcpToolsCount);
    }

    private prefillConnectionInputs() {
        const storedUrl = localStorage.getItem('atlas_gateway_url')
            || localStorage.getItem('ag_gateway_url')
            || '';
        const storedToken = localStorage.getItem('atlas_gateway_token')
            || localStorage.getItem('ag_gateway_token')
            || '';
        const storedChatId = localStorage.getItem('atlas_web_chat_id')
            || localStorage.getItem('atlas_chat_id')
            || localStorage.getItem('ag_web_chat_id')
            || localStorage.getItem('ag_chat_id')
            || '';
        const storedMcpPath = localStorage.getItem('atlas_mcp_config_path')
            || localStorage.getItem('ag_mcp_config_path')
            || '';

        if (storedUrl) {
            this.els.urlInputs.forEach(input => {
                input.value = storedUrl;
            });
        }

        if (storedToken) {
            this.els.tokenInputs.forEach(input => {
                input.value = storedToken;
            });
        }

        if (storedChatId) {
            this.els.chatIdInputs.forEach(input => {
                input.value = storedChatId;
            });
        }

        if (storedMcpPath) {
            this.els.mcpConfigInputs.forEach(input => {
                input.value = storedMcpPath;
            });
        }
    }

    private persistConnection(url: string, token: string, chatId?: string) {
        if (url) localStorage.setItem('atlas_gateway_url', url);
        if (token) localStorage.setItem('atlas_gateway_token', token);
        if (chatId) localStorage.setItem('atlas_web_chat_id', chatId);

        this.els.urlInputs.forEach(input => {
            input.value = url;
        });
        this.els.tokenInputs.forEach(input => {
            if (token) input.value = token;
        });
        if (chatId) {
            this.els.chatIdInputs.forEach(input => {
                input.value = chatId;
            });
        }
    }

    private startUptimeClock() {
        setInterval(() => {
            const diff = Date.now() - this.startTime;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            if (this.els.metricUptime) this.els.metricUptime.textContent = `${hours}h ${minutes}m`;
        }, 60000);
        if (this.els.metricUptime) this.els.metricUptime.textContent = '0h 0m';
    }
}

type TaskStatusPayload = {
    counts: {
        queued: number;
        retrying: number;
        in_progress: number;
        completed: number;
        failed: number;
        cancelled: number;
    };
    tasks: {
        queued: Array<any>;
        retrying: Array<any>;
        in_progress: Array<any>;
        completed: Array<any>;
        failed: Array<any>;
    };
};

type McpServerStatus = {
    id: string;
    command: string;
    args?: string[];
    connected: boolean;
    toolCount: number;
    error?: string;
};

type McpStatusPayload = {
    enabled: boolean;
    configPath?: string;
    servers: McpServerStatus[];
    toolCount: number;
    lastLoaded?: string;
    error?: string;
};

class TasksManager {
    private pollingId: number | null = null;
    private els: {
        pending?: HTMLElement | null;
        inProgress?: HTMLElement | null;
        completed?: HTMLElement | null;
        queuedList?: HTMLElement | null;
        retryingList?: HTMLElement | null;
        inProgressList?: HTMLElement | null;
        failedList?: HTMLElement | null;
    };

    private ready = false;

    constructor(private gatewayProvider: () => GatewayManager) {
        this.els = {
            pending: document.getElementById('tasks-count-pending'),
            inProgress: document.getElementById('tasks-count-in-progress'),
            completed: document.getElementById('tasks-count-completed'),
            queuedList: document.getElementById('tasks-list-queued'),
            retryingList: document.getElementById('tasks-list-retrying'),
            inProgressList: document.getElementById('tasks-list-in-progress'),
            failedList: document.getElementById('tasks-list-failed')
        };

        const hasUI = Object.values(this.els).some(Boolean);
        if (hasUI) {
            this.startPolling();
        }
    }

    public setReady() {
        this.ready = true;
        this.requestUpdate();
    }

    public startPolling() {
        if (this.pollingId) return;
        this.requestUpdate();
        this.pollingId = window.setInterval(() => {
            this.requestUpdate();
        }, 5000);
    }

    public stopPolling() {
        if (this.pollingId) {
            window.clearInterval(this.pollingId);
            this.pollingId = null;
        }
    }

    public requestUpdate() {
        const gateway = this.gatewayProvider();
        if (!this.ready || !gateway || !gateway.isConnected) return;
        gateway.send({
            type: 'command',
            command: 'list_tasks',
            channel: 'web',
            chatId: getStoredChatId(),
            limit: 20
        });
    }

    public handleStatus(payload: TaskStatusPayload) {
        if (!payload) return;
        const counts = payload.counts;
        if (this.els.pending) {
            this.els.pending.textContent = String((counts.queued || 0) + (counts.retrying || 0));
        }
        if (this.els.inProgress) {
            this.els.inProgress.textContent = String(counts.in_progress || 0);
        }
        if (this.els.completed) {
            this.els.completed.textContent = String(counts.completed || 0);
        }

        this.renderList(this.els.inProgressList, payload.tasks.in_progress, 'No active tasks.');
        this.renderList(this.els.queuedList, payload.tasks.queued, 'Queue is empty.');
        this.renderList(this.els.retryingList, payload.tasks.retrying, 'No retrying tasks.');
        this.renderList(this.els.failedList, payload.tasks.failed, 'No failed tasks.');
    }

    private renderList(container: HTMLElement | null | undefined, tasks: Array<any>, emptyText: string) {
        if (!container) return;
        container.innerHTML = '';

        if (!tasks || tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'task-empty';
            empty.textContent = emptyText;
            container.appendChild(empty);
            return;
        }

        for (const task of tasks) {
            const row = document.createElement('div');
            row.className = 'task-item';
            const priority = (task.priority || 'medium').toString().toUpperCase();
            const meta = task.runAfter ? `Run after: ${new Date(task.runAfter).toLocaleString()}` : '';
            const status = task.status || '';

            row.innerHTML = `
                <div class="task-title">${escapeHtml(task.title || 'Untitled Task')}</div>
                <div class="task-meta">
                    <span class="task-badge task-${status}">${escapeHtml(status)}</span>
                    <span class="task-priority">${escapeHtml(priority)}</span>
                    ${meta ? `<span class="task-schedule">${escapeHtml(meta)}</span>` : ''}
                </div>
            `;

            container.appendChild(row);
        }
    }
}

class ChatManager {
    private container: HTMLElement | null;
    private form: HTMLFormElement | null;
    private input: HTMLInputElement | null;
    private searchInput: HTMLInputElement | null;
    private searchClearBtn: HTMLButtonElement | null;
    private searchAllToggle: HTMLInputElement | null;
    private voiceBtn: HTMLButtonElement | null;
    private messages: ChatMessage[] = [];
    private STORAGE_KEY = 'clawdbot_chat_history_v1';
    private searchTimer: number | null = null;
    private searchQuery = '';
    private streamId: string | null = null;
    private streamBuffer = '';
    private streamEl: HTMLElement | null = null;
    private recorder: MediaRecorder | null = null;
    private recording = false;
    private audioChunks: Blob[] = [];
    private recordStream: MediaStream | null = null;

    constructor(private gatewayProvider: () => GatewayManager) {
        this.container = document.getElementById('chat-messages') || document.getElementById('messages');
        this.form = (document.getElementById('chat-form') || document.getElementById('composer')) as HTMLFormElement;
        this.input = document.getElementById('message-input') as HTMLInputElement;
        this.searchInput = document.getElementById('chat-search') as HTMLInputElement;
        this.searchClearBtn = document.getElementById('chat-search-clear') as HTMLButtonElement;
        this.searchAllToggle = document.getElementById('chat-search-all') as HTMLInputElement;
        this.voiceBtn = document.querySelector('[data-voice-btn]') as HTMLButtonElement;

        this.loadHistory();
        this.bindEvents();
    }

    private bindEvents() {
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.searchInput?.addEventListener('input', () => {
            this.scheduleSearch();
        });

        this.searchClearBtn?.addEventListener('click', () => {
            if (this.searchInput) this.searchInput.value = '';
            this.searchQuery = '';
            this.clearMessages();
            this.renderAllMessages();
        });

        this.searchAllToggle?.addEventListener('change', () => {
            if (this.searchQuery) {
                this.scheduleSearch();
            }
        });

        this.voiceBtn?.addEventListener('click', () => {
            void this.toggleVoiceRecording();
        });
    }

    private loadHistory() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.messages = JSON.parse(raw);
                this.messages.forEach(msg => this.renderMessage(msg));
                this.scrollToBottom();
            } else {
                // Add initial greeting if empty
                this.addMessage({
                    id: 'init',
                    role: 'agent',
                    text: 'Welcome to Atlas. Status: Online.',
                    timestamp: Date.now()
                });
            }
        } catch (e) {
            console.error('Failed to load chat history', e);
        }
    }

    private saveHistory() {
        try {
            // Keep last 100 messages to prevent storage bloat
            const toSave = this.messages.slice(-100).map(msg => this.serializeForStorage(msg));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save chat history', e);
        }
    }

    public addMessage(msg: ChatMessage) {
        this.messages.push(msg);
        if (!this.searchQuery) {
            if (msg.role === 'agent' && this.streamEl && !msg.audio) {
                this.streamEl.innerHTML = renderMarkdown(msg.text);
                this.streamEl.classList.remove('streaming');
                this.streamEl = null;
                this.streamId = null;
                this.streamBuffer = '';
            } else {
                this.renderMessage(msg);
            }
        }
        this.saveHistory();
        if (!this.searchQuery) {
            this.scrollToBottom();
        }
    }

    private renderMessage(msg: ChatMessage) {
        if (!this.container) return;

        const el = document.createElement('div');
        el.className = `message ${msg.role}`;
        if (msg.audio) {
            const body = document.createElement('div');
            if (msg.text) {
                const textEl = document.createElement('div');
                textEl.className = 'message-text';
                textEl.innerHTML = renderMarkdown(msg.text);
                body.appendChild(textEl);
            }
            const audioUrl = this.toAudioUrl(msg.audio);
            if (audioUrl) {
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = audioUrl;
                body.appendChild(audio);
            }
            el.appendChild(body);
        } else {
            el.innerHTML = renderMarkdown(msg.text);
        }

        // simple timestamp tooltip
        el.title = new Date(msg.timestamp).toLocaleString();

        this.container.appendChild(el);
    }

    public startStream(id: string) {
        if (!this.container) return;
        if (this.streamEl && this.streamId === id) {
            this.streamBuffer = '';
            this.streamEl.textContent = '';
            this.streamEl.classList.add('streaming');
            this.scrollToBottom();
            return;
        }

        this.streamId = id;
        this.streamBuffer = '';
        const el = document.createElement('div');
        el.className = 'message agent streaming';
        el.textContent = '';
        this.container.appendChild(el);
        this.streamEl = el;
        this.scrollToBottom();
    }

    public appendStream(id: string, delta: string) {
        if (!this.streamEl || this.streamId !== id) return;
        this.streamBuffer += delta;
        this.streamEl.innerHTML = renderMarkdown(this.streamBuffer);
        this.scrollToBottom();
    }

    public endStream(id: string) {
        if (this.streamId !== id) return;
        // Keep element until final message arrives or let it stand as-is.
    }

    private scheduleSearch() {
        if (!this.searchInput) return;
        this.searchQuery = this.searchInput.value.trim();
        if (this.searchTimer) window.clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => {
            this.performSearch();
        }, 250);
    }

    private performSearch() {
        const query = this.searchQuery.trim();
        if (!query) {
            this.clearMessages();
            this.renderAllMessages();
            return;
        }

        const scope = this.searchAllToggle?.checked ? 'all' : 'session';

        this.showSearchResults({
            query,
            results: [],
            pending: true,
            scope
        });

        const gateway = this.gatewayProvider();
        if (gateway && gateway.isConnected) {
            gateway.send({
                type: 'command',
                command: 'search_messages',
                channel: 'web',
                chatId: this.getChatId(),
                query,
                limit: 25,
                scope,
                metadata: {
                    userId: this.getUserId()
                }
            });
        } else {
            this.showSearchResults({
                query,
                results: [],
                error: 'Gateway disconnected.',
                scope
            });
        }
    }

    public handleSearchResults(payload: { query: string; results: any[]; scope?: 'session' | 'all' }) {
        if (payload.query !== this.searchQuery) return;
        this.showSearchResults({ query: payload.query, results: payload.results, scope: payload.scope });
    }

    private showSearchResults(payload: { query: string; results: any[]; pending?: boolean; error?: string; scope?: 'session' | 'all' }) {
        if (!this.container) return;
        this.clearMessages();

        const header = document.createElement('div');
        header.className = 'message system search-header';
        const scopeLabel = payload.scope === 'all' ? 'All Chats' : 'This Chat';
        header.innerHTML = renderMarkdown(`**Search Results** for \`${payload.query}\` • ${scopeLabel}`);
        this.container.appendChild(header);

        if (payload.error) {
            const err = document.createElement('div');
            err.className = 'message system search-empty';
            err.innerHTML = renderMarkdown(`*${payload.error}*`);
            this.container.appendChild(err);
            return;
        }

        if (payload.pending) {
            const loading = document.createElement('div');
            loading.className = 'message system search-empty';
            loading.innerHTML = renderMarkdown('*Searching...*');
            this.container.appendChild(loading);
            return;
        }

        if (!payload.results || payload.results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'message system search-empty';
            empty.innerHTML = renderMarkdown('*No matches found.*');
            this.container.appendChild(empty);
            return;
        }

        payload.results.forEach((result: any) => {
            const item = document.createElement('div');
            item.className = 'message system search-result';
            const score = typeof result.score === 'number' ? Math.round(result.score * 100) : null;
            const lines = result.startLine && result.endLine ? ` • L${result.startLine}-${result.endLine}` : '';
            const meta = `${result.path}${lines}${score !== null ? ` • ${score}%` : ''}`;
            const snippet = result.snippet || '';
            const snippetHtml = highlightText(snippet, payload.query);
            item.innerHTML = `<div class="search-meta">${escapeHtml(meta)}</div><div class="search-snippet">${snippetHtml}</div>`;
            this.container?.appendChild(item);
        });
    }

    private clearMessages() {
        if (!this.container) return;
        this.container.innerHTML = '';
    }

    private renderAllMessages() {
        if (!this.container) return;
        this.messages.forEach(msg => this.renderMessage(msg));
        this.scrollToBottom();
    }

    private getChatId(): string {
        const input = (document.querySelector('[data-chat-id]') as HTMLInputElement | null)
            || (document.getElementById('chat-id') as HTMLInputElement | null);
        const stored = localStorage.getItem('atlas_web_chat_id')
            || localStorage.getItem('atlas_chat_id')
            || localStorage.getItem('ag_web_chat_id')
            || localStorage.getItem('ag_chat_id')
            || '';
        let chatId = input?.value.trim() || stored;
        if (!chatId) {
            chatId = `web-${Math.random().toString(36).slice(2, 10)}`;
        }
        if (input && input.value !== chatId) {
            input.value = chatId;
        }
        localStorage.setItem('atlas_web_chat_id', chatId);
        return chatId;
    }

    private getUserId(): string {
        const stored = localStorage.getItem('atlas_web_user_id')
            || localStorage.getItem('ag_web_user_id');
        if (stored) return stored;
        const fallback = this.getChatId();
        localStorage.setItem('atlas_web_user_id', fallback);
        return fallback;
    }

    private sendMessage() {
        if (!this.input || !this.input.value.trim()) return;

        const text = this.input.value.trim();

        // Add User Message
        this.addMessage({
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: Date.now()
        });

        // Send to Gateway
        const gateway = this.gatewayProvider();
        if (gateway && gateway.isConnected) {
            gateway.send({
                type: 'message',
                channel: 'web',
                chatId: this.getChatId(),
                metadata: {
                    userId: this.getUserId()
                },
                content: {
                    text: text
                }
            });
        } else {
            // Echo offline error
            this.addMessage({
                id: Date.now().toString() + '_err',
                role: 'system',
                text: 'Warning: Gateway disconnected. Message not sent.',
                timestamp: Date.now()
            });
        }

        this.input.value = '';
    }

    private async toggleVoiceRecording() {
        if (this.recording) {
            this.stopVoiceRecording();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            this.addMessage({
                id: Date.now().toString() + '_voice_err',
                role: 'system',
                text: 'Warning: Voice recording is not supported in this browser.',
                timestamp: Date.now()
            });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recordStream = stream;

            const options = this.getSupportedRecorderOptions();
            this.audioChunks = [];
            this.recorder = new MediaRecorder(stream, options || undefined);

            this.recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.recorder.onstop = async () => {
                const blob = new Blob(this.audioChunks, { type: this.recorder?.mimeType || options?.mimeType || 'audio/webm' });
                this.cleanupRecorder();
                if (blob.size === 0) return;

                try {
                    const dataUrl = await this.blobToDataUrl(blob);
                    const base64 = dataUrl.split(',')[1] || '';
                    const filename = `voice_${Date.now()}.${this.mimeToExtension(blob.type)}`;

                    this.addMessage({
                        id: Date.now().toString(),
                        role: 'user',
                        text: 'Voice message',
                        timestamp: Date.now(),
                        audio: {
                            url: dataUrl,
                            mimeType: blob.type,
                            filename
                        }
                    });

                    const gateway = this.gatewayProvider();
                    if (gateway && gateway.isConnected) {
                        gateway.send({
                            type: 'message',
                            channel: 'web',
                            chatId: this.getChatId(),
                            metadata: {
                                userId: this.getUserId()
                            },
                            content: {
                                text: '',
                                audio: {
                                    data: base64,
                                    mimeType: blob.type,
                                    filename
                                }
                            }
                        });
                    } else {
                        this.addMessage({
                            id: Date.now().toString() + '_voice_err',
                            role: 'system',
                            text: 'Warning: Gateway disconnected. Voice message not sent.',
                            timestamp: Date.now()
                        });
                    }
                } catch (err) {
                    console.error('Failed to send voice message', err);
                    this.addMessage({
                        id: Date.now().toString() + '_voice_err',
                        role: 'system',
                        text: 'Warning: Failed to process voice recording.',
                        timestamp: Date.now()
                    });
                }
            };

            this.recorder.start();
            this.setRecordingState(true);
        } catch (err) {
            console.error('Microphone access denied', err);
            this.addMessage({
                id: Date.now().toString() + '_voice_err',
                role: 'system',
                text: 'Warning: Microphone access denied.',
                timestamp: Date.now()
            });
        }
    }

    private stopVoiceRecording() {
        if (this.recorder && this.recording) {
            this.recorder.stop();
        }
        this.setRecordingState(false);
    }

    private cleanupRecorder() {
        if (this.recordStream) {
            this.recordStream.getTracks().forEach(track => track.stop());
            this.recordStream = null;
        }
        this.recorder = null;
        this.audioChunks = [];
    }

    private setRecordingState(state: boolean) {
        this.recording = state;
        if (this.voiceBtn) {
            this.voiceBtn.classList.toggle('recording', state);
            this.voiceBtn.setAttribute('aria-pressed', state ? 'true' : 'false');
        }
    }

    private getSupportedRecorderOptions(): MediaRecorderOptions | null {
        const candidates = [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/webm',
            'audio/ogg'
        ];
        for (const mimeType of candidates) {
            if ((window as any).MediaRecorder?.isTypeSupported?.(mimeType)) {
                return { mimeType };
            }
        }
        return null;
    }

    private mimeToExtension(mimeType: string): string {
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
        return 'wav';
    }

    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    private toAudioUrl(audio: ChatMessage['audio']): string | null {
        if (!audio) return null;
        if (audio.url) return audio.url;
        if (audio.data) {
            const mime = audio.mimeType || 'audio/ogg';
            return `data:${mime};base64,${audio.data}`;
        }
        return null;
    }

    private serializeForStorage(msg: ChatMessage): ChatMessage {
        if (msg.audio) {
            return {
                ...msg,
                text: msg.text || 'Voice message',
                audio: undefined
            };
        }
        return msg;
    }

    private scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }
}

// Initialize
const ui = new UIManager();
const nav = new NavigationManager();
let gateway: GatewayManager;

// Deferred gateway provider for circular dependency resolution
const chat = new ChatManager(() => gateway);
const tasks = new TasksManager(() => gateway);
gateway = new GatewayManager(ui, chat, tasks);
tasks.setReady();

ui.bindEvents(gateway);

// Auto-connect if localhost
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    ui.log('Ready to connect.', 'info');
    // Trigger auto-connect after a short delay
    setTimeout(() => {
        const urlInput = document.getElementById('gateway-url') as HTMLInputElement;
        if (urlInput && urlInput.value) {
            gateway.connect(urlInput.value);
        }
    }, 500);
}


