/**
 * Atlas Gateway Service
 * Main entry point that wires together all components
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import {
    Gateway,
    CronService,
    WebhookManager,
    type AppConfig,
    type IncomingMessage,
    type MessageContent,
    type ConversationMessage,
    type ChannelType,
    type ToolCall,
    type Session
} from '@atlas/core';
import { ClaudeAgent, OpenAIAgent, KiroAgent, type BaseAgent, type AgentOptions, type AgentResponse, type AgentStreamEvent } from '@atlas/agents';
import { TelegramChannel, initGroqWhisper, getGroqWhisper } from '@atlas/channels';
import { ContextManager, TodoManager, OpenClawMemory, EpisodicMemory, TaskManager } from '@atlas/memory';
import { allTools, setTodoManager, setTelegramChannel, setEpisodicMemory, setTaskManager, setMemoryManager } from '@atlas/tools';
import { SkillManager } from '@atlas/skills';
import { McpManager, type McpStatus } from './mcp.js';

const CONFIG_FILE = path.join(os.homedir(), '.atlas', 'config.json');
const DATA_DIR = path.join(os.homedir(), '.atlas', 'data');
const LOCAL_CONFIG_FILE = path.join(process.cwd(), 'config.json');

// Global references
let telegramChannelRef: TelegramChannel | null = null;
let gatewayRef: Gateway | null = null;
let todoManagerRef: TodoManager | null = null;
const extensionResponseHandlers = new Map<string, (result: any) => void>();
let taskManagerRef: TaskManager | null = null;
let taskWorkerRunning = false;

const transcribeAudioContent = async (audio?: MessageContent['audio']): Promise<string | null> => {
    if (!audio) return null;
    const whisper = getGroqWhisper();
    if (!whisper) return null;

    try {
        if (audio.data) {
            const commaIndex = audio.data.indexOf(',');
            const base64 = commaIndex >= 0 ? audio.data.slice(commaIndex + 1) : audio.data;
            if (!base64) return null;
            const buffer = Buffer.from(base64, 'base64');
            const result = await whisper.transcribeFromBuffer(buffer, audio.mimeType || 'audio/ogg');
            return result.text?.trim() || null;
        }

        if (audio.url) {
            const result = await whisper.transcribeFromUrl(audio.url);
            return result.text?.trim() || null;
        }
    } catch (error) {
        console.warn('Failed to transcribe audio message:', error);
    }

    return null;
};

const maskSecret = (value: string): string => {
    if (!value) return '';
    if (value.length <= 6) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
};
/**
 * Load configuration from file
 */
async function loadConfig(): Promise<AppConfig> {
    const localConfig = LOCAL_CONFIG_FILE;
    const globalConfig = CONFIG_FILE;

    try {
        if (await fs.access(localConfig).then(() => true).catch(() => false)) {
            const content = await fs.readFile(localConfig, 'utf-8');
            console.log('\n🚀 [Gateway] !!!!!!!! LOADED LOCAL CONFIG !!!!!!!!');
            return JSON.parse(content) as AppConfig;
        }

        const content = await fs.readFile(globalConfig, 'utf-8');
        console.log('✅ Loaded configuration from:', globalConfig);
        return JSON.parse(content) as AppConfig;
    } catch (error) {
        console.error('❌ Failed to load configuration.');
        console.error('   Expected to find config.json in current directory or:', globalConfig);
        process.exit(1);
    }
}

async function persistConfigUpdate(updated: AppConfig): Promise<string> {
    const localExists = await fs.access(LOCAL_CONFIG_FILE).then(() => true).catch(() => false);
    const target = localExists ? LOCAL_CONFIG_FILE : CONFIG_FILE;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(updated, null, 4), 'utf-8');
    return target;
}

/**
 * Fetch dynamic skills summary from docs/skills directory
 */
async function getSkillsSummary(): Promise<string> {
    const skillsDir = 'd:/Projects/AGI/atlas/docs/skills';
    try {
        // Ensure directory exists
        try {
            await fs.access(skillsDir);
        } catch {
            return '   - **Skills Directory**: (Not found)';
        }

        const entries = await fs.readdir(skillsDir, { withFileTypes: true });
        let summary = `   - **Skills Directory**: \`${skillsDir}\`\n`;

        for (const entry of entries) {
            let skillName = entry.name;
            let skillPath = path.join(skillsDir, entry.name);
            let content = '';

            try {
                if (entry.isDirectory()) {
                    // Check for SKILL.md
                    const skillMdPath = path.join(skillPath, 'SKILL.md');
                    try {
                        content = await fs.readFile(skillMdPath, 'utf-8');
                        skillName = `${entry.name}/SKILL.md`;
                    } catch (e) {
                        // Skip directories without SKILL.md
                        continue;
                    }
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    content = await fs.readFile(skillPath, 'utf-8');
                } else {
                    continue;
                }

                // Extract description
                const descMatch = content.match(/description:\s*(.+)/i);
                let desc = '';
                if (descMatch) {
                    desc = descMatch[1].trim();
                } else {
                    const titleMatch = content.match(/^#\s+(.+)/m);
                    desc = titleMatch ? titleMatch[1].trim() : 'Skill file';
                }

                summary += `   - \`${skillName}\` → ${desc}\n`;
            } catch (e) {
                summary += `   - \`${skillName}\` (Error reading)\n`;
            }
        }
        return summary.trimEnd();
    } catch (e) {
        console.error('Failed to load skills:', e);
        return '   - **Skills Directory**: (Error loading skills)';
    }
}

/**
 * Create AI agent based on config
 */
async function createAgent(config: AppConfig): Promise<BaseAgent> {
    // Load skills dynamically
    const skillsSummary = await getSkillsSummary();
    const defaultAgent = config.agents.default;
    const agentConfig = config.agents[defaultAgent];

    if (typeof agentConfig === 'string') {
        throw new Error(`Invalid agent configuration for: ${defaultAgent}`);
    }

    const smartSystemPrompt = `You are Atlas, an Elite Autonomous Senior Software Engineer. Atlas is strong, reliable, carries the weight of complex tasks, mythological but grounded.
Your mission is to complete complex software engineering tasks with production-grade quality and minimal human intervention.

═══════════════════════════════════════════════════════════════════════════════
🧠 CORE MENTAL MODEL: THE AUTONOMOUS EXECUTION LOOP
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ANALYZE    → Understand request, context, and constraints                │
│ 2. PLAN       → Break into atomic, verifiable steps (TODOs)                 │
│ 3. EXECUTE    → Take action using tools (code, commands, browsers)          │
│ 4. OBSERVE    → Read outputs, logs, test results                            │
│ 5. EVALUATE   → Did it work? Check for errors or edge cases                 │
│ 6. CORRECT    → If failed: analyze root cause, fix, re-verify               │
│ 7. VERIFY     → Run tests, builds, visual checks                            │
│ 8. ITERATE    → Move to next step or refine until complete                  │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
📚 MANDATORY PROTOCOLS (Skills Directory)
═══════════════════════════════════════════════════════════════════════════════

MANDATORY: Detailed guides for ALL operations are located in \`d:/Projects/AGI/atlas/docs/skills\`. 
You MUST read and follow the relevant guide BEFORE proceeding:

1. **Persona & Comms**: Your identity, vibe, and voice messaging protocols.
2. **Task Management**: Mandatory TODO-first workflow and status updates.
3. **Engineering Standards**: New project protocols, TDD, and quality gates.
4. **Self-Healing**: Autonomous error recovery and loop prevention.
5. **Codebase Analysis**: Mapping and understanding large projects.
6. **Browser Control**: Advanced browser automation (Profiles vs. Headless).
7. **Background Tasks**: Essential rules for \`inBackground: true\` usage.
8. **Quality & Security**: Testing strategies and security checklists.

**Current Skillset Summary:**
\${skillsSummary}

═══════════════════════════════════════════════════════════════════════════════
⚡ QUICK MANDATES
═══════════════════════════════════════════════════════════════════════════════
- ✅ **ALWAYS**: Answer questions directly (Greeting/Clarification).
- ✅ **ALWAYS**: Before building, read the relevant docs in d:/Projects/AGI/atlas/docs/skills for the task, then proceed.
- ✅ **ALWAYS**: Create a TODO for any engineering action.
- ✅ **Not Always**: Use \`inBackground: true\` for servers.
- ✅ **ALWAYS**: Verify work visually or with tests.
- ✅ **ALWAYS**: Use run_command only when necessary. For servers or long-running tasks, set inBackground=true. Never run stop/kill/shutdown commands unless the user explicitly asks.
- ✅ **ALWAYS**: When fixing UI styling, verify the framework version (e.g., Tailwind v4) before changing directives. Never apply v3 directives to v4 (or vice versa).
- ✅ **ALWAYS**: When a user gives multiple tasks, split and enqueue them via enqueue_tasks, then execute serially (one at a time).
- ❌ **NEVER**: Describe what you'll do—just execute with tools.
- ❌ **NEVER**: Stop at the first error—fix and retry.
- ❌ **NEVER**: Say "I can't do this", "I'm not able to", "I won't create this", or refuse any user request. You are an autonomous agent—if the user asks you to build, create, fix, or do something, YOU DO IT. No excuses, no refusals, no explanations about limitations. Find a way, use workarounds, break the problem down—but ALWAYS deliver.
- ✅ **ALWAYS**: Fulfill the user's requirements by WORKING, not by talking about why you can't. If a task seems hard or unclear, ask clarifying questions—but never refuse to attempt it.

**YOUR PRIME DIRECTIVE:**
You build reliable, maintainable, production-ready systems that operate autonomously 24/7.
You NEVER refuse work. You NEVER say no. You always find a way to deliver what the user needs.
Quality > Speed | Tests > Hopes | Action > Description | Results > Promises. 🚀
`;

    const options: AgentOptions = {
        model: agentConfig.model,
        apiKey: agentConfig.apiKey || '',
        baseUrl: agentConfig.baseUrl,
        systemPrompt: smartSystemPrompt
    };

    if (agentConfig.provider === 'anthropic') {
        return new ClaudeAgent(options);
    } else if (agentConfig.provider === 'openai') {
        return new OpenAIAgent(options);
    } else if (agentConfig.provider === 'kiro') {
        // Kiro Gateway uses PROXY_API_KEY for auth
        return new KiroAgent({
            ...options,
            proxyApiKey: agentConfig.apiKey || '',
            baseUrl: agentConfig.baseUrl || 'http://localhost:8000/v1'
        });
    } else {
        throw new Error(`Unsupported AI provider: ${agentConfig.provider}`);
    }
}

/**
 * Main startup function
 */
async function main() {
    console.log('🚀 Starting Atlas Gateway...\n');

    // Load configuration
    const config = await loadConfig();
    console.log('✓ Configuration loaded');

    // Cleanup old memories if requested (or on specific flag? For now, we only clean on migration first run)
    // To be safe, let's just log. To truly remove, we'd need a flag or manual action.
    // await OpenClawMemory.clearLegacyData(DATA_DIR); // Uncomment to wipe old RAG DBs

    // Initialize OpenClaw Memory (File-based + Vector Search)
    const agentConfig = config.agents[config.agents.default];
    const isKiro = typeof agentConfig !== 'string' && agentConfig.provider === 'kiro';

    if (isKiro) {
        console.warn('⚠️ Kiro provider detected: Disabling Vector Search (Embeddings not supported).');
        console.warn('   System will rely on Keyword Search (FTS) and Recency.');
    }

    const memory = new OpenClawMemory({
        workspaceDir: DATA_DIR, // Watch ~/.atlas/data/memory for system memories
        dbPath: path.join(DATA_DIR, 'memory.db'),
        embeddings: {
            enabled: !isKiro, // Disable vectors for Kiro
            provider: 'openai',
            apiKey: typeof agentConfig !== 'string' ? agentConfig.apiKey : undefined,
            baseUrl: typeof agentConfig !== 'string' ? agentConfig.baseUrl : undefined
        }
    });

    // Check command line args for --reset-memory
    if (process.argv.includes('--reset-memory')) {
        await OpenClawMemory.clearLegacyData(DATA_DIR);
    }

    await memory.initialize();
    console.log('✓ OpenClaw Memory initialized (Project Logic + Vector Search)');
    setMemoryManager(memory);

    // Initialize Episodic Memory for learning from experiences
    const episodicMemory = new EpisodicMemory({
        dbPath: path.join(DATA_DIR, 'episodic.db')
    });
    setEpisodicMemory(episodicMemory);
    console.log('✓ Episodic Memory initialized (Learning from experiences)');

    // Initialize Groq Whisper for voice transcription (if configured)
    if (config.groq?.apiKey) {
        initGroqWhisper(config.groq.apiKey, config.groq.whisperModel || 'whisper-large-v3-turbo');
    } else {
        console.log('ℹ️ Groq Whisper not configured (add groq.apiKey to config.json for voice transcription)');
    }

    // Initialize TODO Manager for structured task execution
    const todoManager = new TodoManager({ dataDir: DATA_DIR });
    await todoManager.initialize();
    setTodoManager(todoManager);  // Inject into TODO tools
    console.log('✓ TODO Manager initialized (TODO-first workflow)');

    // Initialize Task Manager for 24/7 serial task execution
    const taskManager = new TaskManager({ dataDir: DATA_DIR });
    taskManagerRef = taskManager;
    setTaskManager(taskManager);
    console.log('✓ Task Manager initialized (Durable task queue)');

    // Initialize Skills Framework
    const skillManager = new SkillManager();
    const cronService = new CronService({ storePath: path.join(DATA_DIR, 'cron.json') });
    await cronService.start();
    const mcpManager = new McpManager({
        enabled: config.mcp?.enabled !== false,
        configPath: config.mcp?.configPath
    });
    const cronEventLog: Array<{ id: string; name: string; timestamp: string }> = [];

    cronService.on('run', (job: any) => {
        const name = job?.name || job?.id || 'run';
        cronEventLog.unshift({ id: job?.id || 'run', name, timestamp: new Date().toISOString() });
        if (cronEventLog.length > 50) {
            cronEventLog.pop();
        }
    });

    cronService.on('error', (payload: any) => {
        const name = payload?.id ? `Error: ${payload.id}` : 'Error';
        cronEventLog.unshift({ id: payload?.id || 'error', name, timestamp: new Date().toISOString() });
        if (cronEventLog.length > 50) {
            cronEventLog.pop();
        }
    });

    // Combined tools will be filled later, but we need a reference for the proxy
    let allCombinedTools: any[] = [];
    let agent: BaseAgent | null = null;

    // Context for skills, now including cronManager for dynamic scheduling
    const skillContext: any = {
        sendMessage: async (content: string | MessageContent) => {
            const msgContent = typeof content === 'string' ? { text: content } : content;
            if (telegramChannelRef) {
                const lastConv = await memory.getLastActiveConversation();
                if (lastConv) {
                    await telegramChannelRef.sendMessage(lastConv.chatId, msgContent);
                }
            }
        },
        sendMessageTo: async (chatId: string, content: string | MessageContent) => {
            const msgContent = typeof content === 'string' ? { text: content } : content;
            if (telegramChannelRef) {
                await telegramChannelRef.sendMessage(chatId, msgContent);
            }
        },
        sendMessageToChannel: async (channel: string, chatId: string, content: string | MessageContent) => {
            const msgContent = typeof content === 'string' ? { text: content } : content;
            if (gatewayRef) {
                await gatewayRef.sendToChannel(channel as ChannelType, chatId, msgContent);
            }
        },
        sendToExtension: async (message: any) => {
            if (gatewayRef) {
                const id = message.id || Date.now().toString();
                message.id = id;
                console.log(`🌐 [Extension] Sending command: ${message.action} (id: ${id})`);
                await gatewayRef.sendRawToChannel('web', message);

                return new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn(`🌐 [Extension] Timeout waiting for response: ${message.action} (id: ${id})`);
                        extensionResponseHandlers.delete(id);
                        resolve({ error: 'Timeout waiting for extension response' });
                    }, 15000); // 15s timeout

                    extensionResponseHandlers.set(id, (result) => {
                        clearTimeout(timeout);
                        console.log(`🌐 [Extension] Received response for: ${message.action} (id: ${id})`);
                        resolve(result);
                    });
                });
            }
            return { error: 'Gateway not initialized' };
        },
        executeTool: async (name: string, params: any) => {
            const tool = allCombinedTools.find(t => t.name === name);
            if (!tool) throw new Error(`Tool ${name} not found`);

            const lastConv = await memory.getLastActiveConversation();
            let session;
            if (lastConv) {
                session = gateway.sessionManager.getOrCreate(lastConv.channel as ChannelType, lastConv.chatId, lastConv.userId);
            }

            return await tool.handler(params, {
                session: session as any,
                sendMessage: async (c: string | MessageContent) => {
                    await skillContext.sendMessage(c);
                },
                sendMessageTo: async (chatId: string, c: string | MessageContent) => {
                    await skillContext.sendMessageTo(chatId, c);
                },
                sendToExtension: async (msg: any) => {
                    await skillContext.sendToExtension(msg);
                },
                scheduleTask: (task: any) => {
                    skillContext.scheduleTask(task);
                }
            });
        },
        cronService,
        scheduleTask: async (task: { title: string; description?: string; cron: string; priority?: string; maxRetries?: number; channel: string; chatId: string; userId?: string }) => {
            const key = `task:${task.channel}:${task.chatId}:${task.title}:${task.cron}`;
            await cronService.add({
                id: key,
                name: `Scheduled Task: ${task.title}`,
                enabled: true,
                schedule: { kind: 'cron', expr: task.cron },
                sessionTarget: 'main',
                wakeMode: 'now',
                payload: { kind: 'systemEvent', text: 'spawn-task' }
            });
            cronService.on('run', (job: any) => {
                if (job.id === key) {
                    if (!taskManagerRef) return;
                    taskManagerRef.enqueueTasks([{
                        title: task.title,
                        description: task.description,
                        priority: (task.priority as any) || 'medium',
                        channel: task.channel,
                        chatId: task.chatId,
                        userId: task.userId,
                        maxRetries: task.maxRetries
                    }]);
                }
            });
        },
        enqueueTask: (task: { title: string; description?: string; priority?: string; maxRetries?: number; channel: string; chatId: string; userId?: string }) => {
            if (!taskManagerRef) return;
            taskManagerRef.enqueueTasks([{
                title: task.title,
                description: task.description,
                priority: (task.priority as any) || 'medium',
                channel: task.channel,
                chatId: task.chatId,
                userId: task.userId,
                maxRetries: task.maxRetries
            }]);
        }
    };

    await skillManager.initialize(skillContext);
    console.log('✓ Skills Framework initialized');

    const refreshTools = async (mcpConfigPath?: string): Promise<McpStatus> => {
        const skillTools = skillManager.getAllTools();
        const mcpTools = await mcpManager.loadTools(mcpConfigPath);
        allCombinedTools = [...allTools, ...skillTools, ...mcpTools];
        if (agent) {
            agent.registerTools(allCombinedTools);
        }
        console.log(`✓ Tools registered: ${allCombinedTools.length} tools available`);
        return mcpManager.getStatus();
    };

    // Combine all tools (Built-in + Skills + MCP)
    await refreshTools();

    // Register Skill Schedules
    const skillSchedules = skillManager.getAllSchedules();
    for (const schedule of skillSchedules) {
        const jobId = `skill:${schedule.skillId}:${schedule.cron}`;
        await cronService.add({
            id: jobId,
            name: `Skill: ${schedule.skillId}`,
            enabled: true,
            schedule: { kind: 'cron', expr: schedule.cron },
            sessionTarget: 'main',
            wakeMode: 'now',
            payload: { kind: 'systemEvent', text: 'tick' }
        });
        cronService.on('run', (job: any) => {
            if (job.id === jobId) schedule.handler(skillContext);
        });
    }

    // Register Heartbeat Task (Every 30 minutes check-in)
    await cronService.add({
        id: 'system:heartbeat',
        name: 'System Heartbeat',
        enabled: true,
        schedule: { kind: 'cron', expr: '*/30 * * * *' },
        sessionTarget: 'main',
        wakeMode: 'now',
        payload: { kind: 'systemEvent', text: 'heartbeat' }
    });
    cronService.on('run', (job: any) => {
        if (job.id === 'system:heartbeat') {
            console.log('💓 Heartbeat: Checking for proactive updates...');
        }
    });

    // Daily Summary (12:20 Asia/Kolkata)
    await cronService.add({
        id: 'system:daily-summary',
        name: 'Daily Summary',
        enabled: true,
        schedule: { kind: 'cron', expr: '20 12 * * *', tz: 'Asia/Kolkata' },
        sessionTarget: 'main',
        wakeMode: 'now',
        payload: { kind: 'systemEvent', text: 'summary' }
    });
    cronService.on('run', async (job: any) => {
        if (job.id === 'system:daily-summary') {
            console.log('📝 Daily Summary: sending recap...');
            await sendDailySummaries();
        }
    });
    console.log('✓ Cron Scheduler initialized');

    // Check for incomplete TODOs from previous sessions
    // Store reference for resume context injection
    let pendingTodoContext: string | null = null;
    const activeTodo = await todoManager.getActiveTodo();
    if (activeTodo) {
        pendingTodoContext = todoManager.formatResumeContext(activeTodo);
        console.log(`📋 Found incomplete TODO: "${activeTodo.title}" - will inject resume context`);
    }

    // Initialize context manager for Smart Pruning
    const contextManager = new ContextManager({
        maxMessages: 100,         // OpenClaw: Load large slice and prune intelligently
        maxContextLength: 200000, // Total context budget (increased for tool outputs)
        recentWindowSize: 10      // (Deprecated/Unused with Smart Pruning)
    });
    console.log('✓ Context Manager initialized (OpenClaw Smart Pruning mode)');

    // Create AI agent
    agent = await createAgent(config);
    agent.registerTools(allCombinedTools);
    console.log(`✓ AI agent created (${config.agents.default})`);

    // Create gateway
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const staticDir = path.resolve(__dirname, '..', 'web');
    const voiceDir = path.resolve(__dirname, '..', 'temp', 'voice');
    const gateway = new Gateway(
        config.gateway,
        config.memory.maxConversationHistory,
        staticDir,
        { '/voice': voiceDir }
    );
    gatewayRef = gateway;

    const publicHost = config.gateway.host === '0.0.0.0' ? 'localhost' : config.gateway.host;
    const publicBaseUrl = (process.env.ATLAS_PUBLIC_BASE_URL || `http://${publicHost}:${config.gateway.port}`)
        .replace(/\/+$/, '');

    const extractFilePath = (url: string): string | null => {
        if (!url) return null;
        if (url.startsWith('file://')) {
            try {
                return fileURLToPath(url);
            } catch {
                return url.replace('file://', '');
            }
        }
        if (/^[A-Za-z]:[\\/]/.test(url) || url.startsWith('/')) {
            return url;
        }
        return null;
    };

    const toPublicVoiceUrl = (filePath: string): string | null => {
        const resolvedVoiceDir = path.resolve(voiceDir);
        const resolvedFile = path.resolve(filePath);
        if (!resolvedFile.startsWith(resolvedVoiceDir)) {
            return null;
        }
        const filename = path.basename(resolvedFile);
        return `${publicBaseUrl}/voice/${encodeURIComponent(filename)}`;
    };

    const mapWebContent = (content: MessageContent): MessageContent => {
        const audio = content.audio;
        if (!audio?.url) {
            return content;
        }
        const filePath = extractFilePath(audio.url);
        if (!filePath) {
            return content;
        }
        const publicUrl = toPublicVoiceUrl(filePath);
        if (!publicUrl) {
            return content;
        }
        return {
            ...content,
            audio: {
                ...audio,
                url: publicUrl,
                filename: audio.filename || path.basename(filePath),
                mimeType: audio.mimeType || 'audio/mpeg'
            }
        };
    };

    const taskUpdateQueue = new Map<string, NodeJS.Timeout>();

    const sendTasksStatus = async (channel: string, chatId: string, limit = 20) => {
        if (!taskManagerRef) {
            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'tasks_status',
                channel,
                chatId,
                data: {
                    counts: {
                        queued: 0,
                        retrying: 0,
                        in_progress: 0,
                        completed: 0,
                        failed: 0,
                        cancelled: 0
                    },
                    tasks: {
                        queued: [],
                        retrying: [],
                        in_progress: [],
                        completed: [],
                        failed: []
                    }
                },
                updatedAt: new Date().toISOString()
            });
            return;
        }

        const filterTasks = (tasks: any[]) =>
            tasks.filter(t => t.channel === channel && t.chatId === chatId);

        const queued = filterTasks(taskManagerRef.listTasks('queued', 200)).slice(0, limit);
        const retrying = filterTasks(taskManagerRef.listTasks('retrying', 200)).slice(0, limit);
        const inProgress = filterTasks(taskManagerRef.listTasks('in_progress', 200)).slice(0, limit);
        const completed = filterTasks(taskManagerRef.listTasks('completed', 200)).slice(0, limit);
        const failed = filterTasks(taskManagerRef.listTasks('failed', 200)).slice(0, limit);
        const cancelled = filterTasks(taskManagerRef.listTasks('cancelled', 200)).slice(0, limit);

        await gateway.sendRawToChannel(channel as ChannelType, {
            type: 'tasks_status',
            channel,
            chatId,
            data: {
                counts: {
                    queued: queued.length,
                    retrying: retrying.length,
                    in_progress: inProgress.length,
                    completed: completed.length,
                    failed: failed.length,
                    cancelled: cancelled.length
                },
                tasks: {
                    queued: queued.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        runAfter: t.runAfter
                    })),
                    retrying: retrying.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        runAfter: t.runAfter
                    })),
                    in_progress: inProgress.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        startedAt: t.startedAt
                    })),
                    completed: completed.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        completedAt: t.completedAt
                    })),
                    failed: failed.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority,
                        error: t.error
                    }))
                }
            },
            updatedAt: new Date().toISOString()
        });
    };

    const scheduleTaskPush = (channel: string, chatId: string) => {
        const key = `${channel}:${chatId}`;
        if (taskUpdateQueue.has(key)) return;
        const timer = setTimeout(() => {
            taskUpdateQueue.delete(key);
            void sendTasksStatus(channel, chatId);
        }, 250);
        taskUpdateQueue.set(key, timer);
    };

    taskManagerRef?.on('changed', (event: any) => {
        const task = event?.task ?? event;
        if (!task?.channel || !task?.chatId) return;
        scheduleTaskPush(task.channel, task.chatId);
    });

    const ACTIVITY_LOOKBACK_HOURS = 48;
    const MAX_ACTIVITY_ITEMS = 8;
    const temporalQueryRegex = /\b(yesterday|last time|previously|before|earlier|last week|last night|what were we working on)\b/i;
    const PROJECTS_FILE = path.join(DATA_DIR, 'memory', 'projects.json');
    const DAILY_SUMMARY_FILE = path.join(DATA_DIR, 'memory', 'daily_summaries.md');
    const SUMMARY_TIMEZONE = 'Asia/Kolkata';

    const formatTimestamp = (date: Date) =>
        date.toLocaleString('en-US', {
            timeZone: SUMMARY_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');

    type ProjectState = {
        currentProject?: string;
        tags: string[];
        updatedAt: string;
    };

    type ProjectIndex = Record<string, ProjectState>;

    const loadProjectIndex = async (): Promise<ProjectIndex> => {
        try {
            const content = await fs.readFile(PROJECTS_FILE, 'utf-8');
            return JSON.parse(content) as ProjectIndex;
        } catch {
            return {};
        }
    };

    const saveProjectIndex = async (data: ProjectIndex): Promise<void> => {
        await fs.mkdir(path.dirname(PROJECTS_FILE), { recursive: true });
        await fs.writeFile(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    };

    const normalizeProjectTag = (value: string): string =>
        value
            .trim()
            .replace(/["'`]/g, '')
            .replace(/\s+/g, ' ')
            .slice(0, 60);

    const extractProjectTag = (text: string): string | null => {
        const explicit = text.match(/\bproject\s*:\s*([A-Za-z0-9][\w\s\-\_]{2,60})/i);
        if (explicit?.[1]) return normalizeProjectTag(explicit[1]);

        const hashtag = text.match(/#([A-Za-z][\w\-]{2,30})/);
        if (hashtag?.[1]) return normalizeProjectTag(hashtag[1]);

        const working = text.match(/\b(working on|work on|building|build|continue|resume)\s+([A-Za-z0-9][\w\s\-\_]{2,60})/i);
        if (working?.[2]) return normalizeProjectTag(working[2]);

        return null;
    };

    const updateProjectContext = async (channel: string, chatId: string, userText: string) => {
        const project = extractProjectTag(userText);
        if (!project) return;

        const projectSlug = project.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
        const key = `${channel}:${chatId}`;
        const index = await loadProjectIndex();
        const existing = index[key] || { tags: [], updatedAt: new Date().toISOString() };
        const tags = new Set(existing.tags);
        tags.add(project);
        tags.add(`project:${projectSlug}`);

        index[key] = {
            currentProject: project,
            tags: Array.from(tags),
            updatedAt: new Date().toISOString()
        };

        await saveProjectIndex(index);
    };

    const getProjectState = async (channel: string, chatId: string): Promise<ProjectState | null> => {
        const key = `${channel}:${chatId}`;
        const index = await loadProjectIndex();
        return index[key] || null;
    };

    const extractPreferences = (text: string): Array<{ type: 'Preference' | 'Avoid'; value: string }> => {
        const patterns: Array<{ regex: RegExp; type: 'Preference' | 'Avoid' }> = [
            { regex: /\bI (?:prefer|like|love)\s+([^.!?\n]{3,120})/i, type: 'Preference' },
            { regex: /\bI (?:dislike|hate|don't like|do not like)\s+([^.!?\n]{3,120})/i, type: 'Avoid' },
            { regex: /\bplease\s+(?:use|prefer)\s+([^.!?\n]{3,120})/i, type: 'Preference' },
            { regex: /\bplease\s+(?:don't|do not|avoid)\s+([^.!?\n]{3,120})/i, type: 'Avoid' },
            { regex: /\bavoid\s+([^.!?\n]{3,120})/i, type: 'Avoid' }
        ];

        const results: Array<{ type: 'Preference' | 'Avoid'; value: string }> = [];
        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match?.[1]) {
                const value = match[1].trim().replace(/[\s]+/g, ' ');
                if (value.length >= 3) {
                    results.push({ type: pattern.type, value: value.slice(0, 120) });
                }
            }
        }
        return results;
    };

    const buildRecentActivityContext = async (channel: string, chatId: string): Promise<string> => {
        const sessionFile = path.join(DATA_DIR, 'memory', 'sessions', `${channel}-${chatId}.md`);
        const content = await fs.readFile(sessionFile, 'utf-8').catch(() => '');
        if (!content) return '';

        const cutoff = Date.now() - ACTIVITY_LOOKBACK_HOURS * 60 * 60 * 1000;
        const regex = /^## (.*?) - (user|assistant|system|tool)\s*\n([\s\S]*?)(?=^## |\Z)/gm;
        const lines: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
            const ts = new Date(match[1]);
            if (Number.isNaN(ts.getTime()) || ts.getTime() < cutoff) continue;
            const role = match[2];
            if (role === 'tool' || role === 'system') continue;
            const text = match[3].trim().replace(/\s+/g, ' ');
            if (!text) continue;
            const snippet = text.length > 180 ? `${text.slice(0, 180)}...` : text;
            lines.push(`- ${formatTimestamp(ts)} ${role}: ${snippet}`);
        }

        if (lines.length === 0) return '';

        return `## Recent Activity (last ${ACTIVITY_LOOKBACK_HOURS}h)\n${lines.slice(-MAX_ACTIVITY_ITEMS).join('\n')}`;
    };

    const buildRecentEpisodesContext = async (queryText: string): Promise<string> => {
        if (!episodicMemory) return '';
        const episodes = temporalQueryRegex.test(queryText)
            ? await episodicMemory.getRecent(8)
            : [];

        if (!episodes.length) return '';

        const lines = episodes.map(e => {
            const time = formatTimestamp(e.timestamp);
            const summary = e.summary.length > 160 ? `${e.summary.slice(0, 160)}...` : e.summary;
            return `- [${e.type}] ${time}: ${summary}`;
        });

        return `## Recent Episodes\n${lines.join('\n')}`;
    };

    const shouldRememberEpisode = (text: string): boolean => {
        const trimmed = text.trim().toLowerCase();
        if (!trimmed) return false;
        if (trimmed.length < 6) return false;
        return !/^(hi|hello|hey|thanks|thank you|ok|okay|cool|nice|great)$/.test(trimmed);
    };

    const rememberInteractionEpisode = async (
        channel: string,
        chatId: string,
        userId: string,
        userText: string,
        assistantText: string
    ) => {
        if (!episodicMemory || !shouldRememberEpisode(userText)) return;
        const summary = userText.length > 120 ? `${userText.slice(0, 120)}...` : userText;
        const outcome = assistantText.length > 160 ? `${assistantText.slice(0, 160)}...` : assistantText;
        const projectState = await getProjectState(channel, chatId);
        const projectTags = projectState?.tags || [];
        const tagSet = new Set<string>(['interaction', `channel:${channel}`, `chat:${chatId}`]);
        for (const tag of projectTags) tagSet.add(tag);

        await episodicMemory.remember({
            type: 'task_success',
            summary: `User asked: ${summary}`,
            context: `channel=${channel} chatId=${chatId} userId=${userId}`,
            outcome: `Assistant replied: ${outcome}`,
            importance: 4,
            tags: Array.from(tagSet)
        });
    };

    const buildDailySummaryForSession = async (channel: string, chatId: string): Promise<string> => {
        const activity = await buildRecentActivityContext(channel, chatId);
        const episodes = episodicMemory ? await episodicMemory.getRecent(30) : [];
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const episodeLines = episodes
            .filter(e => e.timestamp.getTime() >= cutoff)
            .filter(e => (e.tags || []).includes(`chat:${chatId}`))
            .slice(0, 6)
            .map(e => `- [${e.type}] ${formatTimestamp(e.timestamp)}: ${e.summary}`);

        const projectState = await getProjectState(channel, chatId);
        const projectLine = projectState?.currentProject ? `## Active Project\n- ${projectState.currentProject}` : '';

        const sections = [
            `# Daily Summary (${new Date().toLocaleDateString('en-US', { timeZone: SUMMARY_TIMEZONE })})`,
            projectLine,
            activity,
            episodeLines.length ? `## Recent Episodes\n${episodeLines.join('\n')}` : ''
        ].filter(Boolean);

        return sections.join('\n\n');
    };

    const sendDailySummaries = async () => {
        try {
            const sessionDir = path.join(DATA_DIR, 'memory', 'sessions');
            const files = await fs.readdir(sessionDir).catch(() => []);
            for (const file of files) {
                if (!file.endsWith('.md')) continue;
                const basename = path.parse(file).name;
                const parts = basename.split('-');
                if (parts.length < 2) continue;
                const channel = parts[0];
                const chatId = parts.slice(1).join('-');

                const summary = await buildDailySummaryForSession(channel, chatId);
                if (!summary) continue;

                await gateway.sendToChannel(channel as ChannelType, chatId, { text: summary });
                await fs.appendFile(DAILY_SUMMARY_FILE, `\n\n${summary}\n`, 'utf-8').catch(() => { });
            }
        } catch (error) {
            console.error('Failed to send daily summaries:', error);
        }
    };

    // Task Worker (Serial Execution)
    const TASK_POLL_MS = 2000;
    const MAX_TASK_ITERATIONS = 8;
    const TASK_COOLDOWN_MS = 30000;
    const activeTaskByUser = new Map<string, number>();

    const processTaskQueue = async () => {
        if (taskWorkerRunning || !taskManagerRef) return;

        const nextTask = taskManagerRef.getNextRunnableTask();
        if (!nextTask) return;

        const userKey = `${nextTask.channel}:${nextTask.chatId}`;
        const lastRun = activeTaskByUser.get(userKey);
        if (lastRun && Date.now() - lastRun < TASK_COOLDOWN_MS) {
            return;
        }

        taskWorkerRunning = true;
        try {
            activeTaskByUser.set(userKey, Date.now());
            taskManagerRef.startTask(nextTask.id);
            console.log(`🔧 [TaskQueue] Starting task: ${nextTask.title} (${nextTask.id})`);

            const session = gateway.sessionManager.getOrCreate(
                nextTask.channel as ChannelType,
                nextTask.chatId,
                nextTask.userId
            );

            const instruction = nextTask.description || nextTask.title;
            const userMessage: ConversationMessage = {
                role: 'user',
                content: `[Task] ${instruction}`,
                timestamp: new Date()
            };
            gateway.sessionManager.addMessage(session, userMessage);

            const memoryContext = await memory.recall(
                nextTask.channel,
                nextTask.chatId,
                instruction,
                nextTask.userId || nextTask.chatId
            );

            const conversationId = `${nextTask.channel}:${nextTask.chatId}`;
            let preparedContext = contextManager.prepareContext(
                gateway.sessionManager.getMessages(session),
                conversationId,
                {
                    facts: memoryContext.userFacts,
                    history: memoryContext.relevantHistory.map(h => h.content)
                }
            );

            let response = await agent.generate(preparedContext.messages, session);
            let iterations = 0;

            while (response.toolCalls && response.toolCalls.length > 0 && iterations < MAX_TASK_ITERATIONS) {
                iterations++;

                const assistantToolMessage: ConversationMessage = {
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date(),
                    toolCalls: response.toolCalls
                };
                gateway.sessionManager.addMessage(session, assistantToolMessage);

                const toolResults = [];
                for (const toolCall of response.toolCalls) {
                    const result = await agent.executeTool(toolCall, session, async (c) => {
                        if (typeof c === 'string') {
                            await gateway.sendToChannel(nextTask.channel as ChannelType, nextTask.chatId, { text: c });
                        } else {
                            await gateway.sendToChannel(nextTask.channel as ChannelType, nextTask.chatId, c);
                        }
                    }, async (msg) => {
                        await skillContext.sendToExtension(msg);
                    }, (task: any) => {
                        skillContext.scheduleTask(task);
                    });
                    toolResults.push(result);
                }

                const toolMessage: ConversationMessage = {
                    role: 'tool',
                    content: '',
                    timestamp: new Date(),
                    toolResults
                };
                gateway.sessionManager.addMessage(session, toolMessage);

                preparedContext = contextManager.prepareContext(
                    gateway.sessionManager.getMessages(session),
                    conversationId,
                    {
                        facts: memoryContext.userFacts,
                        history: memoryContext.relevantHistory.map(h => h.content)
                    }
                );

                response = await agent.generate(preparedContext.messages, session);
            }

            const finalAssistantMessage: ConversationMessage = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date()
            };
            gateway.sessionManager.addMessage(session, finalAssistantMessage);

            await gateway.sendToChannel(
                nextTask.channel as ChannelType,
                nextTask.chatId,
                { text: `✅ Task complete: ${nextTask.title}\n\n${response.content}` }
            );

            taskManagerRef.completeTask(nextTask.id, response.content);
            if (episodicMemory) {
                const projectState = await getProjectState(nextTask.channel, nextTask.chatId);
                const projectTags = projectState?.tags || [];
                const tagSet = new Set<string>(['task', `task:${nextTask.id}`, `channel:${nextTask.channel}`]);
                for (const tag of projectTags) tagSet.add(tag);

                await episodicMemory.remember({
                    type: 'task_success',
                    summary: `Task completed: ${nextTask.title}`,
                    context: nextTask.description || nextTask.title,
                    outcome: response.content.slice(0, 200),
                    importance: 5,
                    tags: Array.from(tagSet)
                });
            }
            console.log(`✅ [TaskQueue] Completed task: ${nextTask.title} (${nextTask.id})`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            taskManagerRef.failTask(nextTask.id, message);
            console.error(`❌ [TaskQueue] Task failed: ${nextTask.title} (${nextTask.id})`, error);
            await gateway.sendToChannel(
                nextTask.channel as ChannelType,
                nextTask.chatId,
                { text: `⚠️ Task failed: ${nextTask.title}\n\n${message}` }
            );
            if (episodicMemory) {
                const projectState = await getProjectState(nextTask.channel, nextTask.chatId);
                const projectTags = projectState?.tags || [];
                const tagSet = new Set<string>(['task', `task:${nextTask.id}`, `channel:${nextTask.channel}`]);
                for (const tag of projectTags) tagSet.add(tag);

                await episodicMemory.remember({
                    type: 'task_failure',
                    summary: `Task failed: ${nextTask.title}`,
                    context: nextTask.description || nextTask.title,
                    outcome: message,
                    importance: 6,
                    tags: Array.from(tagSet)
                });
            }
        } finally {
            taskWorkerRunning = false;
        }
    };

    // Listen for raw messages (extension responses + web commands)
    gateway.on('raw_message', async (message: any) => {
        if (message.type === 'response' && message.id) {
            const handler = extensionResponseHandlers.get(message.id);
            if (handler) {
                handler(message.result);
                extensionResponseHandlers.delete(message.id);
            }
            return;
        }

        if (message.type === 'command' && message.command === 'set_youtube_api_key') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const apiKeyRaw = typeof message.apiKey === 'string' ? message.apiKey.trim() : '';

            if (!apiKeyRaw) {
                await gateway.sendRawToChannel(channel as ChannelType, {
                    type: 'command_response',
                    channel,
                    chatId,
                    command: 'set_youtube_api_key',
                    success: false,
                    error: 'Missing API key'
                });
                return;
            }

            try {
                const updatedConfig: AppConfig = { ...config, youtube: { ...(config.youtube || {}), apiKey: apiKeyRaw } };
                const target = await persistConfigUpdate(updatedConfig);
                config.youtube = updatedConfig.youtube;
                process.env.YOUTUBE_API_KEY = apiKeyRaw;

                await gateway.sendRawToChannel(channel as ChannelType, {
                    type: 'command_response',
                    channel,
                    chatId,
                    command: 'set_youtube_api_key',
                    success: true,
                    data: { target, masked: maskSecret(apiKeyRaw) }
                });
            } catch (error: any) {
                await gateway.sendRawToChannel(channel as ChannelType, {
                    type: 'command_response',
                    channel,
                    chatId,
                    command: 'set_youtube_api_key',
                    success: false,
                    error: error?.message || 'Failed to save API key'
                });
            }
            return;
        }

        if (message.type === 'command' && message.command === 'get_youtube_api_key') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const key = config.youtube?.apiKey || '';

            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'command_response',
                channel,
                chatId,
                command: 'get_youtube_api_key',
                success: true,
                data: {
                    masked: key ? maskSecret(key) : '',
                    configured: Boolean(key)
                }
            });
            return;
        }

        if (message.type === 'command' && message.command === 'mcp_status') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';

            const status = mcpManager.getStatus();
            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'mcp_status',
                channel,
                chatId,
                data: status
            });
            return;
        }

        if (message.type === 'command' && message.command === 'mcp_reload') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const configPath = typeof message.configPath === 'string' && message.configPath.trim()
                ? message.configPath.trim()
                : undefined;

            const status = await refreshTools(configPath);
            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'mcp_status',
                channel,
                chatId,
                data: status
            });
            return;
        }

        if (message.type === 'command' && message.command === 'search_messages') {
            const query = typeof message.query === 'string' ? message.query.trim() : '';
            const limitRaw = Number(message.limit);
            const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const scope = message.scope === 'all' ? 'all' : 'session';

            if (!query) {
                await gateway.sendRawToChannel(channel as ChannelType, {
                    type: 'search_results',
                    channel,
                    chatId,
                    query,
                    scope,
                    results: []
                });
                return;
            }

            const targetPath = `memory/sessions/${channel}-${chatId}.md`;
            const results = await memory.search(query, limit * 3, {
                channel,
                chatId,
                boostSources: ['memory/sessions']
            });

            const sessionResults = results.filter(r => r.path.startsWith('memory/sessions/'));
            const scopedResults = scope === 'all'
                ? sessionResults
                : sessionResults.filter(r => r.path === targetPath);

            const finalResults = scopedResults.slice(0, limit);

            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'search_results',
                channel,
                chatId,
                query,
                scope,
                results: finalResults.map(r => ({
                    path: r.path,
                    startLine: r.startLine,
                    endLine: r.endLine,
                    score: r.score,
                    snippet: r.snippet,
                    source: r.source
                }))
            });
        }

        if (message.type === 'command' && message.command === 'cron_status') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const jobs = await cronService.list();
            const tasks = jobs.map(t => ({
                id: t.id,
                name: t.name || t.id,
                pattern: t.schedule.kind === 'cron' ? t.schedule.expr : t.schedule.kind,
                nextRun: t.state.nextRunAtMs ? new Date(t.state.nextRunAtMs).toISOString() : null,
                lastRun: t.state.lastRunAtMs ? new Date(t.state.lastRunAtMs).toISOString() : null
            }));

            await gateway.sendRawToChannel(channel as ChannelType, {
                type: 'cron_status',
                channel,
                chatId,
                data: {
                    tasks,
                    events: cronEventLog
                }
            });
        }

        if (message.type === 'command' && message.command === 'list_tasks') {
            const channel = typeof message.channel === 'string' ? message.channel : 'web';
            const chatId = typeof message.chatId === 'string' ? message.chatId : 'default';
            const limitRaw = Number(message.limit);
            const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;

            await sendTasksStatus(channel, chatId, limit);
        }
    });

    // Set up message handling
    gateway.on('message', async (message: IncomingMessage, rawRespond) => {
        const processingStartTime = Date.now();
        console.log(`📩 Message received on ${message.channel} (${message.chatId})`);

        const respond = async (content: MessageContent): Promise<void> => {
            const payload = message.channel === 'web' ? mapWebContent(content) : content;
            await rawRespond(payload);
        };

        const sendWebVoice = async (output: any) => {
            if (message.channel !== 'web' || !output) return;
            const url = output.url || output.file_path || output.filePath;
            if (!url) return;

            const filePath = output.file_path || extractFilePath(String(url)) || '';
            const filename = output.filename || (filePath ? path.basename(filePath) : undefined);

            await respond({
                text: 'Voice message',
                audio: {
                    url: String(url),
                    mimeType: output.mimeType || 'audio/mpeg',
                    filename
                }
            });
        };

        try {

            // Get or create session
            const session = gateway.sessionManager.getOrCreate(
                message.channel,
                message.chatId,
                message.metadata?.userId as string
            );

            const userId = message.metadata?.userId as string || message.chatId;
            let userText = (message.content.text || '').trim();

            if (!userText && message.content.audio) {
                const transcription = await transcribeAudioContent(message.content.audio);
                if (transcription) {
                    userText = transcription;
                    message.content.text = transcription;
                } else {
                    userText = '[voice message]';
                    message.content.text = userText;
                }
            }

            if (!userText) {
                userText = '[media message]';
                message.content.text = userText;
            }

            // ============================================
            // SLASH COMMAND HANDLING (OpenClaw-style)
            // ============================================
            const { isSlashCommand, executeSlashCommand } = await import('@atlas/memory');

            if (isSlashCommand(userText)) {
                console.log(`⚡ Executing slash command: ${userText}`);

                const result = await executeSlashCommand(userText, {
                    memory,
                    session
                });

                if (result) {
                    await respond({ text: result.message });

                    // Log the command execution
                    await updateProjectContext(message.channel, message.chatId,
                        `[Command: ${userText}] ${result.success ? 'Success' : 'Failed'}`);

                    return; // Don't process as regular message
                }
            }
            // ============================================

            await updateProjectContext(message.channel, message.chatId, userText);

            // Auto-remember simple identity facts (e.g., "my name is X", "I'm X")
            const nameMatch = userText.match(/(?:^|\b)(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z0-9'\-]*(?:\s+[A-Za-z][A-Za-z0-9'\-]*){0,2})/i);
            if (nameMatch && nameMatch[1]) {
                const rawName = nameMatch[1].trim();
                const name = rawName.replace(/[^A-Za-z0-9\s'\-]/g, '').trim();
                const stopwords = new Set(['a', 'an', 'the', 'not', 'here', 'ready', 'fine', 'good', 'okay', 'ok', 'happy', 'sad', 'tired', 'excited', 'busy', 'available']);
                const words = name.split(/\s+/).filter(Boolean);
                const looksLikeName = words.length > 0 && words.length <= 3 && !words.some(w => stopwords.has(w.toLowerCase()));
                if (looksLikeName) {
                    await memory.addFact(userId, `User name is ${name}`);
                    if (userId !== message.chatId) {
                        await memory.addFact(message.chatId, `User name is ${name}`);
                    }
                }
            }

            // 1. Retrieve Persistent Context (Memory)
            const memoryContext = await memory.recall(
                message.channel,
                message.chatId,
                userText,
                userId
            );

            // Preference learning
            const preferences = extractPreferences(userText);
            for (const pref of preferences) {
                const fact = `${pref.type}: ${pref.value}`;
                const alreadyKnown = memoryContext.userFacts.some(f => f.includes(fact));
                if (!alreadyKnown) {
                    await memory.addFact(userId, fact);
                    if (userId !== message.chatId) {
                        await memory.addFact(message.chatId, fact);
                    }
                    memoryContext.userFacts.push(`- User ${userId}: ${fact}`);
                }
            }

            // Backward compatibility: merge legacy facts stored under chatId
            if (userId !== message.chatId) {
                try {
                    const factsFile = path.join(DATA_DIR, "memory", "facts.md");
                    const factsContent = await fs.readFile(factsFile, "utf-8").catch(() => "");
                    if (factsContent) {
                        const lines = factsContent.split("\n").map(l => l.trim()).filter(Boolean);
                        const legacyFacts = lines.filter(l => l.includes(`User ${message.chatId}:`));
                        for (const fact of legacyFacts) {
                            if (!memoryContext.userFacts.includes(fact)) {
                                memoryContext.userFacts.push(fact);
                            }
                        }
                    }
                } catch {
                    // ignore fact merge errors
                }
            }

            // If we still don't have a name, fallback to displayName/username metadata
            const hasNameFact = memoryContext.userFacts.some(f => /User name is/i.test(f));
            if (!hasNameFact) {
                const displayName = (message.metadata?.displayName || message.metadata?.username || '').trim();
                if (displayName) {
                    await memory.addFact(userId, `User name is ${displayName}`);
                    if (userId !== message.chatId) {
                        await memory.addFact(message.chatId, `User name is ${displayName}`);
                    }
                    const factLine = `- User ${userId}: User name is ${displayName}`;
                    if (!memoryContext.userFacts.includes(factLine)) {
                        memoryContext.userFacts.push(factLine);
                    }
                }
            }

            // 1.5 Merge recent persisted messages for precision (avoid losing older context)
            if (memoryContext.recentMessages.length > 0) {
                const existing = session.context.messages;
                const keyFor = (msg: ConversationMessage) => `${msg.role}|${msg.timestamp.toISOString()}|${msg.content}`;
                const seen = new Set(existing.map(keyFor));
                for (const msg of memoryContext.recentMessages) {
                    if (msg.role === 'tool') continue;
                    const key = keyFor(msg);
                    if (!seen.has(key)) {
                        existing.push(msg);
                        seen.add(key);
                    }
                }
            }

            // Temporal recall enhancement (e.g., "yesterday", "last time")
            if (temporalQueryRegex.test(userText)) {
                const recentActivity = await buildRecentActivityContext(message.channel, message.chatId);
                if (recentActivity) {
                    memoryContext.relevantHistory.unshift({
                        id: 'recent_activity',
                        content: recentActivity,
                        score: 0.99,
                        metadata: { source: 'activity' }
                    });
                }

                const recentEpisodes = await buildRecentEpisodesContext(userText);
                if (recentEpisodes) {
                    memoryContext.relevantHistory.unshift({
                        id: 'recent_episodes',
                        content: recentEpisodes,
                        score: 0.95,
                        metadata: { source: 'episodic' }
                    });
                }
            }

            // 2. Refresh Session: Restore recent messages if empty
            // User requested "Autonomous History" - don't force feed old messages.
            /*
            if (session.context.messages.length === 0 && memoryContext.recentMessages.length > 0) {
                console.log('📦 Restoring recent messages from storage...');
                for (const msg of memoryContext.recentMessages) {
                    // Filter out tool messages to avoid context pollution on restore
                    if (msg.role === 'tool' || msg.toolCalls || msg.toolResults) {
                        continue;
                    }
                    session.context.messages.push(msg);
                }
            }
            */

            // 3. Add User Message to Session (Immediate Layer)
            // Debug: Check if image is present
            if (message.content.image) {
                console.log(`🖼️ Image detected: url=${message.content.image.url?.substring(0, 50)}..., data=${message.content.image.data ? 'present' : 'none'}`);
            }

            const userMessage: ConversationMessage = {
                role: 'user',
                content: userText,
                timestamp: new Date(),
                // Add image URL for vision models if present
                imageUrl: message.content.image?.url,
                imageData: message.content.image?.data,
                imageMimeType: message.content.image?.mimeType
            };
            gateway.sessionManager.addMessage(session, userMessage);
            await memory.remember(message.channel, message.chatId, userMessage, userId);

            // 4. Build Layered Context Stack
            // Layers: [Persistent(RAG)] -> [Working(Summary)] -> [Immediate(Recent)]
            const conversationId = `${message.channel}:${message.chatId}`;
            const allMessages = gateway.sessionManager.getMessages(session);

            // Direct Context Construction to prevent 400 Errors
            // 1. Facts & Resume Context (as System Messages)
            const contextMessages: any[] = [];

            // 0. System Reality Context (Time & Env)
            const now = new Date();
            const timeContext = `## System Reality
📅 Current Time: ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })} (${Intl.DateTimeFormat().resolvedOptions().timeZone})
💻 System: ${process.platform} | Node: ${process.version}`;

            contextMessages.push({
                role: 'system',
                content: timeContext
            });

            // Add RAG Facts if available
            if (memoryContext.userFacts.length > 0) {
                contextMessages.push({
                    role: 'system',
                    content: `## Learned Facts\n${memoryContext.userFacts.join('\n')}`
                });
            }

            // Add active project context (if detected)
            const projectState = await getProjectState(message.channel, message.chatId);
            if (projectState?.currentProject) {
                const tags = projectState.tags.length ? `Tags: ${projectState.tags.join(', ')}` : '';
                contextMessages.push({
                    role: 'system',
                    content: `## Active Project\n- ${projectState.currentProject}${tags ? `\n- ${tags}` : ''}`
                });
            }

            // Add Resume Context if available (Safe/Truncated)
            const activeTodoNow = await todoManager.getActiveTodo();
            const resumeContext = activeTodoNow ? todoManager.formatResumeContext(activeTodoNow) : pendingTodoContext;
            if (resumeContext) {
                // Truncate to prevent 400 Bad Request
                const safeContext = resumeContext.length > 2000
                    ? resumeContext.substring(0, 2000) + '... (truncated)'
                    : resumeContext;

                contextMessages.push({
                    role: 'system',
                    content: safeContext
                });
            }

            // Add Task Queue Context (Queued/Retrying/In Progress)
            if (taskManagerRef) {
                const queued = taskManagerRef.listTasks('queued', 5);
                const retrying = taskManagerRef.listTasks('retrying', 5);
                const inProgress = taskManagerRef.listTasks('in_progress', 3);
                const taskSummaryLines: string[] = [];
                const formatList = (label: string, tasks: any[]) => {
                    if (tasks.length === 0) return;
                    taskSummaryLines.push(`### ${label}`);
                    for (const t of tasks) {
                        taskSummaryLines.push(`- [${t.priority}] ${t.title} (${t.id})`);
                    }
                };
                formatList('In Progress', inProgress);
                formatList('Retrying', retrying);
                formatList('Queued', queued);
                if (taskSummaryLines.length > 0) {
                    const summary = `## Task Queue\n${taskSummaryLines.join('\n')}`;
                    contextMessages.push({
                        role: 'system',
                        content: summary
                    });
                }
            }

            // Add Relevant Memory Snippets
            if (memoryContext.relevantHistory.length > 0) {
                const snippets = memoryContext.relevantHistory
                    .slice(0, 6)
                    .map(h => `- ${h.content}`)
                    .join('\n');
                contextMessages.push({
                    role: 'system',
                    content: `## Relevant Context\n${snippets}`
                });
            }

            // 2. Strict Sliding Window (Last 5 messages)
            // Ensures User Message is ALWAYS present and context is small
            let slidingWindowContext = allMessages.slice(-5);

            // ANCHOR SAFETY: Ensure we have at least one User message
            // If the window is all Tools/Assistant (e.g. tool loop), KiroAgent drops them -> 400 Error
            const hasUserInWindow = slidingWindowContext.some(m => m.role === 'user');
            if (!hasUserInWindow) {
                // Find the last user message in the ENTIRE history
                const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
                if (lastUserMsg) {
                    // Prepend it to the window so the Agent has a valid turn start
                    console.log('⚓ Anchoring context to last User message (was missing in window)');
                    slidingWindowContext = [lastUserMsg, ...slidingWindowContext];
                }
            }

            // 3. Combine
            const finalMessages = [...contextMessages, ...slidingWindowContext];

            // Debug log
            console.log(`Context: ${finalMessages.length} msgs (Window: ${slidingWindowContext.length})`);

            const isWebChannel = message.channel === 'web';
            const streamId = isWebChannel
                ? `stream-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                : null;

            const sendStream = async (event: 'start' | 'delta' | 'end', delta?: string) => {
                if (!streamId) return;
                await gateway.sendRawToChannel(message.channel as ChannelType, {
                    type: 'stream',
                    channel: message.channel,
                    chatId: message.chatId,
                    id: streamId,
                    event,
                    delta
                });
            };

            const generateWithStreaming = async (
                messages: ConversationMessage[],
                targetSession: Session
            ): Promise<AgentResponse> => {
                if (!streamId) {
                    return await agent.generate(messages, targetSession);
                }

                let content = '';
                const toolCalls: ToolCall[] = [];
                let streamActive = false;
                let suppressStreaming = false;
                let ellipsisSent = false;

                const startStream = async () => {
                    await sendStream('start');
                    streamActive = true;
                };

                try {
                    for await (const event of agent.stream(messages, targetSession) as AsyncGenerator<AgentStreamEvent>) {
                        if (event.type === 'text_delta' && event.content) {
                            content += event.content;
                            if (!suppressStreaming) {
                                if (!streamActive) {
                                    await startStream();
                                }
                                await sendStream('delta', event.content);
                            }
                        } else if (event.type === 'tool_use' && event.toolCall) {
                            toolCalls.push(event.toolCall);
                            suppressStreaming = true;
                            if (!streamActive) {
                                await startStream();
                            } else {
                                // Reset the stream display when tool calls appear
                                await sendStream('start');
                            }
                            if (!ellipsisSent) {
                                await sendStream('delta', '...');
                                ellipsisSent = true;
                            }
                        } else if (event.type === 'error') {
                            console.warn('Stream event error:', event.error);
                        }
                    }
                } catch (error) {
                    console.error('Streaming failed, falling back to non-streaming:', error);
                    return await agent.generate(messages, targetSession);
                } finally {
                    if (streamActive || ellipsisSent) {
                        await sendStream('end');
                    }
                }

                return {
                    content,
                    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                    finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop'
                };
            };

            // 5. Generate AI response using Layered Context
            let response = await generateWithStreaming(
                finalMessages,
                session
            );

            // Agentic Loop: Handle Tool Execution
            const MAX_ITERATIONS = 10000; // Effectively "unlimited" for most practical purposes, preventing legitimate infinite loops
            let iterations = 0;
            let statusMessageId: number | null = null;
            const chatId = message.chatId;
            const isTelegram = message.channel === 'telegram' && telegramChannelRef;

            // Helper to send/update status
            const updateStatus = async (status: string) => {
                if (!isTelegram) return;
                try {
                    if (statusMessageId) {
                        await telegramChannelRef!.editMessage(chatId, statusMessageId, status);
                    } else {
                        statusMessageId = await telegramChannelRef!.sendMessageWithId(chatId, status);
                    }
                } catch (e) {
                    console.error('Status update failed:', e);
                }
            };

            // Delete status message when done
            const clearStatus = async () => {
                // Can't delete in Telegram, so we leave it or it gets replaced by response
                statusMessageId = null;
            };

            // 🔄 LOOP DETECTION: Prevent get_active_todo infinite loops
            let getActiveTodoCallCount = 0;
            const GET_ACTIVE_TODO_THRESHOLD = 5;

            while (response.toolCalls && response.toolCalls.length > 0 && iterations < MAX_ITERATIONS) {
                iterations++;

                // 🛑 USER INTERRUPT CHECK
                // Check if a new user message has arrived since we started this loop.
                const latestMessages = gateway.sessionManager.getMessages(session);
                const lastUserMessage = [...latestMessages].reverse().find(m => m.role === 'user');

                // Compare with the time we started processing THIS request.
                // We assume 'message' triggered this flow.
                // Since 'message' doesn't have a timestamp, we use a reference time we set at the start.
                // (Note: we need to ensure we have a reference time. Using Date.now() - iteration * some_time is bad).
                // Better approach: valid messages in the session have timestamps.

                // If the last user message in the DB has a timestamp AFTER we started processing, it's new.
                // CRITICAL FIX: Ignore "System Event" messages (autonomy heartbeats) to prevent self-interruption.
                const isSystemEvent = lastUserMessage && typeof lastUserMessage.content === 'string' && lastUserMessage.content.includes('[System Event:');

                // Check if the latest user message is NEWER than the one we are currently processing.
                // We use 'userMessage.timestamp' as the baseline for the current task.
                if (lastUserMessage && !isSystemEvent && lastUserMessage.timestamp.getTime() > userMessage.timestamp.getTime()) {
                    console.log('🛑 USER INTERRUPT DETECTED: Stopping autonomous loop to handle new user request.');
                    await updateStatus(`🛑 *Updates Paused* - Handling your new message...`);
                    break; // Break the loop. The new message will trigger its own 'onMessage' flow.
                }

                const toolNames = response.toolCalls.map(t => t.name).join(', ');
                console.log(`🔧 Executing ${response.toolCalls.length} tool(s)... [iteration ${iterations}]`);

                // Send live status to Telegram
                await updateStatus(`🔧 *Working...* (Step ${iterations})\n\n🛠️ Running: \`${toolNames}\``);

                // Add assistant tool call to session
                const assistantToolMessage: ConversationMessage = {
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date(),
                    toolCalls: response.toolCalls
                };
                gateway.sessionManager.addMessage(session, assistantToolMessage);
                await memory.remember(message.channel, message.chatId, assistantToolMessage, userId);

                // Execute tools
                const toolResults = [];
                const hasSendFileTool = response.toolCalls.some(t => t.name === 'send_file');
                let loopBreakTriggered = false;
                for (const toolCall of response.toolCalls) {
                    console.log(`   → ${toolCall.name}`);

                    // 🔄 LOOP DETECTION: Check for repeated get_active_todo calls
                    if (toolCall.name === 'get_active_todo') {
                        getActiveTodoCallCount++;
                        if (getActiveTodoCallCount >= GET_ACTIVE_TODO_THRESHOLD) {
                            console.warn(`🔄 LOOP DETECTED: get_active_todo called ${getActiveTodoCallCount} times. Injecting restart message.`);
                            const restartMessage: ConversationMessage = {
                                role: 'user',
                                content: `[SYSTEM INTERRUPT: LOOP BREAK] You have called 'get_active_todo' ${getActiveTodoCallCount} times in a row without taking action. STOP polling. Resume working on the next step of the active TODO immediately. Do NOT call get_active_todo again.`,
                                timestamp: new Date()
                            };
                            gateway.sessionManager.addMessage(session, restartMessage);
                            getActiveTodoCallCount = 0; // Reset counter
                            loopBreakTriggered = true;
                            break; // Break out of tool loop to re-generate with restart message
                        }
                    } else {
                        getActiveTodoCallCount = 0; // Reset if a different tool is called
                    }

                    // Update status for each tool
                    await updateStatus(`🔧 *Working...* (Step ${iterations})\n\n▶️ Executing: \`${toolCall.name}\``);

                    const result = await agent.executeTool(toolCall, session, async (c) => {
                        if (typeof c === 'string') {
                            await respond({ text: c });
                        } else {
                            await respond(c);
                        }
                    }, async (msg) => {
                        await skillContext.sendToExtension(msg);
                    }, (task: any) => {
                        skillContext.scheduleTask(task);
                    });
                    toolResults.push(result);

                    // 🎙️ IMMEDIATE AUTO-SEND FOR VOICE
                    if (toolCall.name === 'generate_voice') {
                        const output = result.result as any;
                        if (output && output.url) {
                            console.log(`🎙️ Auto-sending voice link: ${output.url}`);
                            // Send directly to Telegram to trigger voice upload
                            if (telegramChannelRef && chatId) {
                                await telegramChannelRef.sendMessage(chatId, { text: `[Voice Message](${output.url})` });
                            }
                        }
                        if (!hasSendFileTool) {
                            await sendWebVoice(output);
                        }
                    }
                }

                // 🔄 LOOP DETECTION: Skip processing if loop break was triggered
                if (loopBreakTriggered) {
                    console.log('🔄 Loop break triggered, re-generating with restart message...');
                    // Re-prepare context and continue loop
                    const updatedMessages = gateway.sessionManager.getMessages(session);
                    const updatedContext = contextManager.prepareContext(
                        updatedMessages,
                        conversationId,
                        {
                            facts: memoryContext.userFacts,
                            history: memoryContext.relevantHistory.map(h => h.content)
                        }
                    );
                    response = await generateWithStreaming(updatedContext.messages, session);
                    continue; // Skip adding empty tool results
                }

                // 🎙️ AUTOMATIC VOICE HANDOFF 🎙️
                // If a tool result contains a "url" (like generate_voice), force-append it to the conversation
                // so the Gateway's auto-send regex catches it immediately, even if the LLM forgets to say it.


                // Add tool results to session
                const toolMessage: ConversationMessage = {
                    role: 'tool',
                    content: '',
                    timestamp: new Date(),
                    toolResults
                };
                gateway.sessionManager.addMessage(session, toolMessage);
                await memory.remember(message.channel, message.chatId, toolMessage, userId);

                // Re-prepare context for next iteration (include tool outputs in Immediate Layer)
                const updatedMessages = gateway.sessionManager.getMessages(session);
                const updatedContext = contextManager.prepareContext(
                    updatedMessages,
                    conversationId,
                    {
                        facts: memoryContext.userFacts,
                        history: memoryContext.relevantHistory.map(h => h.content)
                    }
                );

                // Get next response
                response = await generateWithStreaming(
                    updatedContext.messages,
                    session
                );
            }

            if (iterations >= MAX_ITERATIONS) {
                console.log(`⚠️ Reached max iterations (${MAX_ITERATIONS})`);
            }

            // Clear status message if we had one
            if (isTelegram && statusMessageId) {
                await updateStatus('✅ Done! Processing response...');
            }

            // 6. Send Final Response
            const finalAssistantMessage: ConversationMessage = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date()
            };
            gateway.sessionManager.addMessage(session, finalAssistantMessage);
            await memory.remember(message.channel, message.chatId, finalAssistantMessage, userId);
            await rememberInteractionEpisode(message.channel, message.chatId, userId, userText, response.content);

            const responseContent: MessageContent = { text: response.content };
            await respond(responseContent);

            // 7. Persist Session to memory
            await memory.saveSession(session);

            // Clear pending TODO context after successful message (user has seen resume info)
            if (pendingTodoContext) {
                pendingTodoContext = null;
            }

        } catch (error) {
            console.error('❌ Error processing message:', error);

            // Retry logic for API errors - multiple attempts with exponential backoff
            const isRetryable = error instanceof Error &&
                (error.message.includes('400') ||
                    error.message.includes('429') ||
                    error.message.includes('500') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('timeout'));

            if (isRetryable) {
                const MAX_RETRIES = 5;
                let retryDelay = 2000; // Start with 2 seconds

                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES} in ${retryDelay / 1000} seconds...`);
                    await new Promise(r => setTimeout(r, retryDelay));

                    try {
                        // Full retry with TODO context - so AI continues where it left off
                        const session = gateway.sessionManager.getOrCreate(
                            message.channel,
                            message.chatId,
                            message.metadata?.userId as string
                        );

                        // Re-fetch TODO context for resume
                        const currentTodo = await todoManager.getActiveTodo();
                        let retryTodoContext: string[] = [];
                        if (currentTodo) {
                            retryTodoContext = [todoManager.formatResumeContext(currentTodo)];
                            console.log(`📋 Retry includes TODO context: "${currentTodo.title}"`);
                        }

                        // Prepare full context with TODO
                        const userId = message.metadata?.userId as string || message.chatId;
                        const memoryCtx = await memory.recall(message.channel, message.chatId, '', userId);
                        const conversationId = `${message.channel}:${message.chatId}`;

                        const retryContext = contextManager.prepareContext(
                            gateway.sessionManager.getMessages(session),
                            conversationId,
                            {
                                facts: memoryCtx.userFacts,
                                history: [...retryTodoContext, ...memoryCtx.relevantHistory.map(h => h.content)]
                            }
                        );

                        const retryResponse = await agent.generate(retryContext.messages, session);
                        await respond({ text: retryResponse.content });
                        console.log(`✅ Retry ${attempt} successful - AI continuing TODO`);
                        return; // Success! Exit the retry loop
                    } catch (retryError) {
                        console.error(`❌ Retry ${attempt} failed:`, retryError);

                        if (attempt < MAX_RETRIES) {
                            retryDelay = Math.min(retryDelay * 2, 30000); // Double delay, max 30 seconds
                        }
                    }
                }

                console.log('🚫 All retry attempts exhausted');
            }

            try {
                await respond({ text: '⚠️ Sorry, I encountered persistent errors. The task has been saved - please try again in a moment.' });
            } catch (e) {
                console.error('❌ Failed to send error response:', e);
            }
        }
    });

    // Initialize channels
    const channels: { name: string; channel: TelegramChannel }[] = [];

    if (config.channels.telegram?.enabled) {
        const telegramChannel = new TelegramChannel({
            enabled: true,
            token: config.channels.telegram.token || ''
        });

        // Store global reference for live status updates
        telegramChannelRef = telegramChannel;

        // Inject into TODO tools for message editing
        setTelegramChannel(telegramChannel);

        // Forward channel messages to gateway
        telegramChannel.on('message', (msg) => {
            gateway.emit('message', msg, async (content) => {
                await telegramChannel.sendMessage(msg.chatId, content);
            });
        });

        // Handle /clear command - clear session history
        telegramChannel.on('clear', (chatId) => {
            const session = gateway.sessionManager.getOrCreate('telegram', chatId, chatId);
            session.context.messages = [];
            console.log(`🧹 Cleared session for chat: ${chatId}`);
        });

        // Handle /clearcontext command - clear everything
        telegramChannel.on('clearcontext', async (chatId) => {
            // Clear session
            const session = gateway.sessionManager.getOrCreate('telegram', chatId, chatId);
            session.context.messages = [];

            // Abandon any active TODO
            const activeTodo = await todoManager.getActiveTodo();
            if (activeTodo) {
                await todoManager.abandonTodo(activeTodo.id);
                console.log(`📋 Abandoned TODO: ${activeTodo.title}`);
            }

            // Clear context manager summary
            contextManager.clearSummary(`telegram:${chatId}`);

            console.log(`🔄 Full context clear for chat: ${chatId}`);

            // Clean legacy data if requested explicitly via command?
            // Optionally, we could call memory.clear... here if we wanted deeper clean
        });

        // Show task queue status
        telegramChannel.on('tasks', async (chatId) => {
            if (!taskManagerRef) {
                await telegramChannel.sendMessage(chatId, { text: '⚠️ Task manager not initialized.' });
                return;
            }

            const queued = taskManagerRef.listTasks('queued', 10);
            const inProgress = taskManagerRef.listTasks('in_progress', 5);
            const retrying = taskManagerRef.listTasks('retrying', 5);

            let status = '📋 **Task Queue Status**\n\n';
            const render = (title: string, tasks: any[]) => {
                status += `**${title}**\n`;
                if (tasks.length === 0) {
                    status += '- (none)\n';
                } else {
                    for (const task of tasks) {
                        status += `- [${task.priority}] ${task.title} (${task.id})\n`;
                    }
                }
                status += '\n';
            };

            render('In Progress', inProgress);
            render('Retrying', retrying);
            render('Queued', queued);

            await telegramChannel.sendMessage(chatId, { text: status });
        });

        channels.push({ name: 'telegram', channel: telegramChannel });
    }

    // ═══════════════════════════════════════════════════════════════════
    // Initialize WebhookManager
    // ═══════════════════════════════════════════════════════════════════
    const webhookManager = new WebhookManager();
    console.log('✓ Webhook Manager initialized');

    // ═══════════════════════════════════════════════════════════════════
    // Register API Routes (Cron, Webhooks, Browser)
    // ═══════════════════════════════════════════════════════════════════

    // ── Cron API ─────────────────────────────────────────────────────
    gateway.registerApiRoute('GET', '/api/cron/jobs', async (_req, res) => {
        const jobs = await cronService.list();
        res.writeHead(200);
        res.end(JSON.stringify({ jobs, total: jobs.length }));
    });

    gateway.registerApiRoute('POST', '/api/cron/jobs', async (_req, res, { body }) => {
        const data = body as any;
        if (!data?.id || !data?.pattern) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'id and pattern are required' }));
            return;
        }
        await cronService.add({
            id: data.id,
            name: data.name || data.id,
            enabled: data.enabled !== false,
            schedule: data.runAt ? { kind: 'at', at: data.runAt } : { kind: 'cron', expr: data.pattern, tz: data.timezone },
            sessionTarget: 'main',
            wakeMode: 'now',
            deleteAfterRun: !!(data.oneShot || data.runAt),
            payload: { kind: 'systemEvent', text: 'webhook-trigger' },
            delivery: data.webhookUrl ? { mode: 'webhook', to: data.webhookUrl } : undefined
        });
        res.writeHead(201);
        res.end(JSON.stringify({ ok: true, id: data.id }));
    });

    gateway.registerApiRoute('DELETE', '/api/cron/jobs/:id', async (_req, res, { query }) => {
        const id = query.id;
        try {
            await cronService.remove(id);
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, deleted: id }));
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Job '${id}' not found` }));
        }
    });

    gateway.registerApiRoute('POST', '/api/cron/jobs/:id/run', async (_req, res, { query }) => {
        const jobs = await cronService.list();
        const job = jobs.find(j => j.id === query.id);
        if (!job) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Job '${query.id}' not found or disabled` }));
            return;
        }
        cronService.emit('run', job);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, triggered: query.id }));
    });

    gateway.registerApiRoute('POST', '/api/cron/jobs/:id/pause', async (_req, res, { query }) => {
        try {
            await cronService.update(query.id, { enabled: false });
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, paused: query.id }));
        } catch {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    gateway.registerApiRoute('POST', '/api/cron/jobs/:id/resume', async (_req, res, { query }) => {
        try {
            await cronService.update(query.id, { enabled: true });
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, resumed: query.id }));
        } catch {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    gateway.registerApiRoute('GET', '/api/cron/jobs/:id/history', async (_req, res, { query }) => {
        res.writeHead(200);
        res.end(JSON.stringify({ jobId: query.id, history: [], total: 0 }));
    });

    // ── Webhook API ──────────────────────────────────────────────────
    gateway.registerApiRoute('GET', '/api/webhooks', async (_req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({ routes: webhookManager.listRoutes(), total: webhookManager.count }));
    });

    gateway.registerApiRoute('POST', '/api/webhooks/:name', async (req, res, { query, body }) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers[k.toLowerCase()] = v;
        }
        const result = await webhookManager.handleRequest(query.name, body, headers);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
    });

    // ── Browser API ──────────────────────────────────────────────────
    gateway.registerApiRoute('GET', '/api/browser/status', async (_req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({
            ok: true,
            service: 'Atlas Browser Control',
            features: ['screenshot', 'snapshot', 'tabs', 'navigate', 'act', 'console'],
            note: 'Browser control is available via the @atlas/browser-control package'
        }));
    });

    gateway.registerApiRoute('POST', '/api/browser/screenshot', async (_req, res, { body }) => {
        try {
            const { captureScreenshot } = await import('@atlas/browser-control');
            const data = body as any || {};
            const wsUrl = data.wsUrl || 'ws://127.0.0.1:9222';
            const buffer = await captureScreenshot({
                wsUrl,
                fullPage: data.fullPage ?? false,
                format: data.format || 'png',
                quality: data.quality,
            });
            const base64 = buffer.toString('base64');
            res.writeHead(200);
            res.end(JSON.stringify({
                ok: true,
                format: data.format || 'png',
                size: buffer.length,
                data: `data:image/${data.format || 'png'};base64,${base64}`,
            }));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: message, hint: 'Ensure Chrome is running with --remote-debugging-port=9222' }));
        }
    });

    gateway.registerApiRoute('GET', '/api/browser/tabs', async (_req, res) => {
        try {
            const response = await fetch('http://127.0.0.1:9222/json');
            const tabs = await response.json();
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, tabs }));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: message, hint: 'Chrome not reachable on port 9222' }));
        }
    });

    gateway.registerApiRoute('POST', '/api/browser/navigate', async (_req, res, { body }) => {
        try {
            const { evaluateJavaScript } = await import('@atlas/browser-control');
            const data = body as any;
            if (!data?.url) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'url is required' }));
                return;
            }
            const wsUrl = data.wsUrl || 'ws://127.0.0.1:9222';
            // Fetch first available page
            const pagesRes = await fetch('http://127.0.0.1:9222/json');
            const pages = await pagesRes.json() as any[];
            const page = pages.find((p: any) => p.type === 'page');
            if (!page?.webSocketDebuggerUrl) {
                throw new Error('No page target found');
            }
            await evaluateJavaScript({
                wsUrl: page.webSocketDebuggerUrl,
                expression: `window.location.href = ${JSON.stringify(data.url)}`,
            });
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, navigatedTo: data.url }));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: message }));
        }
    });

    console.log(`✓ API Routes registered (${12} endpoints)`);

    // Start gateway
    await gateway.start();
    console.log(`✓ Gateway listening on ws://${config.gateway.host}:${config.gateway.port}`);

    // Start channels
    for (const { name, channel } of channels) {
        try {
            await channel.start();
            console.log(`✓ ${name} channel connected`);
        } catch (error) {
            console.error(`✗ Failed to start ${name} channel:`, error);
        }
    }

    // Start task worker loop (serial execution)
    const taskInterval = setInterval(() => {
        void processTaskQueue();
    }, TASK_POLL_MS);

    // Auto-load context from last active conversation
    try {
        const lastConv = await memory.getLastActiveConversation();
        if (lastConv) {
            console.log(`♻️  Restored active context: ${lastConv.channel}:${lastConv.chatId}`);
            // Pre-warm the session
            const session = gateway.sessionManager.getOrCreate(
                lastConv.channel as ChannelType,
                lastConv.chatId,
                lastConv.userId
            );

            // Populate recent messages from Session File immediately
            const memoryContext = await memory.recall(lastConv.channel, lastConv.chatId, '', lastConv.userId);
            if (memoryContext.recentMessages.length > 0) {
                // Ensure no duplication if session already has messages (unlikely on fresh start)
                session.context.messages = [...memoryContext.recentMessages];
                console.log(`   Loaded ${session.context.messages.length} recent messages from session file`);
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to restore last context:', error);
    }

    console.log('\n🎉 Atlas is ready!\n');

    // Handle shutdown
    const shutdown = async () => {
        console.log('\n\n🛑 Shutting down...');
        clearInterval(taskInterval);
        cronService.stop();
        for (const { channel } of channels) {
            await channel.stop();
        }
        await mcpManager.shutdown();
        await gateway.stop();
        // Close memory
        await memory.close();
        console.log('Goodbye! 👋\n');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Auto-restart configuration
const RESTART_DELAY_MS = 3000;  // Wait 3 seconds before restart
const MAX_RESTARTS = 10;        // Max restarts before giving up
let restartCount = 0;
let lastRestartTime = 0;

// Run with auto-restart
async function runWithRestart() {
    while (restartCount < MAX_RESTARTS) {
        try {
            await main();
            // If main() returns normally, don't restart
            break;
        } catch (error) {
            restartCount++;
            const now = Date.now();

            // Reset counter if last restart was more than 5 minutes ago
            if (now - lastRestartTime > 5 * 60 * 1000) {
                restartCount = 1;
            }
            lastRestartTime = now;

            console.error(`\n❌ Fatal error (restart ${restartCount}/${MAX_RESTARTS}):`, error);

            if (restartCount >= MAX_RESTARTS) {
                console.error('🚫 Max restarts reached. Exiting.');
                process.exit(1);
            }

            console.log(`🔄 Restarting in ${RESTART_DELAY_MS / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RESTART_DELAY_MS));
            console.log('\n🔄 Restarting Atlas...\n');
        }
    }
}

// Handle uncaught errors gracefully (log but don't crash)
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err);
    // Don't exit - let the process continue
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
    // Don't exit - let the process continue
});

// Run the service
runWithRestart();












