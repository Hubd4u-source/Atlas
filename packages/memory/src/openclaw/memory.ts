
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3"; // Use better-sqlite3 directly
import chokidar, { type FSWatcher } from "chokidar";

// Import our local modules
import {
    buildFileEntry,
    chunkMarkdown,
    ensureDir,
    hashText,
    isMemoryPath,
    listMemoryFiles,
    MemoryChunk,
    MemoryFileEntry,
    normalizeRelPath,
} from "./internal.js";
import { ConversationMessage, Session, UserProfile } from '@atlas/core';
import { bm25RankToScore, buildFtsQuery, mergeHybridResults } from "./hybrid.js";
import { searchKeyword, searchVector, SearchRowResult } from "./manager-search.js";
import { ensureMemoryIndexSchema } from "./memory-schema.js";
import { loadSqliteVecExtension } from "./sqlite-vec.js";
import { MockEmbeddingProvider, EmbeddingProvider, createEmbeddingProvider } from "./embeddings.js";
import { extractKeywords } from "./query-expansion.js";

const MAX_CHUNK_TOKENS = 512;
const CHUNK_OVERLAP = 64;
const VECTOR_TABLE = "chunks_vec";
const FTS_TABLE = "chunks_fts";
const EMBEDDING_CACHE_TABLE = "embedding_cache";
const SNIPPET_MAX_CHARS = 1000;

export interface OpenClawMemoryOptions {
    workspaceDir: string;
    dbPath: string;
    extraPaths?: string[];
    embeddings?: {
        enabled: boolean;
        provider?: 'openai' | 'mock';
        apiKey?: string;
        baseUrl?: string;
        model?: string;
        fallbackToFts?: boolean;  // NEW: Allow FTS-only mode when embeddings fail
    };
    useHybrid?: boolean;
    query?: {
        minScore?: number;
        maxResults?: number;
        hybrid?: {
            enabled: boolean;
            vectorWeight: number;
            textWeight: number;
            candidateMultiplier: number;
            mmr?: {  // NEW: MMR configuration for result diversification
                enabled: boolean;
                lambda: number;  // 0.0 = max diversity, 1.0 = max relevance
            };
            temporalDecay?: {  // NEW: Recency boosting
                enabled: boolean;
                halfLifeDays: number;  // Default: 30 days
            };
        };
    };
}

export type MemorySearchResult = {
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: string;
    mtimeMs?: number;
};

export interface MemoryContext {
    recentMessages: ConversationMessage[];
    relevantHistory: { id: string; content: string; score: number; metadata?: any }[];
    userFacts: string[];
}

export class OpenClawMemory {
    private db: Database.Database;
    private provider: EmbeddingProvider | null;  // Can be null in FTS-only mode
    private providerUnavailableReason?: string;  // Track why provider is unavailable
    private vectorReady: Promise<boolean> | null = null;
    private watcher: FSWatcher | null = null;
    private dirty = false;
    private syncing: Promise<void> | null = null;
    private options: OpenClawMemoryOptions;

    // State for vector/fts availability
    private vectorEnabled: boolean;
    private vectorAvailable: boolean | null = null;
    private ftsEnabled: boolean;
    private ftsAvailable: boolean = false;
    private vectorDims: number | null = null;

    // NEW: Batch failure tracking
    private batchFailureCount = 0;
    private readonly BATCH_FAILURE_LIMIT = 2;
    private batchFailureLastError?: string;

    constructor(options: OpenClawMemoryOptions) {
        this.options = options;
        this.vectorEnabled = options.embeddings?.enabled ?? true;
        this.ftsEnabled = options.useHybrid ?? true;

        // Ensure directory exists
        const dbDir = path.dirname(options.dbPath);
        ensureDir(dbDir);

        // Open Database
        this.db = new Database(options.dbPath);

        // Initialize provider with FTS-only fallback support
        if (this.vectorEnabled) {
            try {
                this.provider = createEmbeddingProvider({
                    provider: options.embeddings?.provider || 'mock',
                    apiKey: options.embeddings?.apiKey,
                    baseUrl: options.embeddings?.baseUrl,
                    model: options.embeddings?.model
                });
            } catch (error) {
                const fallbackEnabled = options.embeddings?.fallbackToFts ?? true;
                if (fallbackEnabled && this.ftsEnabled) {
                    console.warn('[Memory] Embedding provider failed, falling back to FTS-only mode:', error);
                    this.provider = null;
                    this.providerUnavailableReason = error instanceof Error ? error.message : String(error);
                } else {
                    throw error;
                }
            }
        } else {
            this.provider = new MockEmbeddingProvider();
        }

        // Initialize Schema
        const schemaResult = ensureMemoryIndexSchema({
            db: this.db,
            embeddingCacheTable: EMBEDDING_CACHE_TABLE,
            ftsTable: FTS_TABLE,
            ftsEnabled: this.ftsEnabled
        });
        this.ftsAvailable = schemaResult.ftsAvailable;

        // Load vector extension if enabled
        if (this.vectorEnabled) {
            void this.ensureVectorReady();
        }

        // Start watcher
        this.ensureWatcher();
    }

    static async clearLegacyData(dataDir: string): Promise<void> {
        console.log(`[Memory] Cleaning up legacy memory files in ${dataDir}...`);
        const legacyFiles = ['rag.db', 'rag.db-shm', 'rag.db-wal', 'memory.sqlite', 'vectors.json'];
        for (const file of legacyFiles) {
            const p = path.join(dataDir, file);
            try {
                await fs.unlink(p);
                console.log(`   Deleted ${file}`);
            } catch (e: any) {
                if (e.code !== 'ENOENT') console.warn(`   Failed to delete ${file}:`, e.message);
            }
        }
    }

    async initialize(): Promise<void> {
        // Trigger initial sync
        await this.sync({ force: true });
    }

    // ... rest of methods unchanged ...

    /**
     * Remember a message by appending it to the session file.
     * This mimics RAGMemory.remember but uses file-based persistence.
     */
    async remember(
        channel: string,
        chatId: string,
        message: ConversationMessage,
        userId?: string
    ): Promise<void> {
        const sessionId = `${channel}-${chatId}`;
        const sessionDir = path.join(this.options.workspaceDir, "memory", "sessions");
        ensureDir(sessionDir);
        const sessionFile = path.join(sessionDir, `${sessionId}.md`);

        const timestamp = message.timestamp.toISOString();
        let logEntry = `\n## ${timestamp} - ${message.role}\n`;
        if (userId) logEntry += `User: ${userId}\n`;
        logEntry += `${message.content}\n`;

        if (message.toolCalls) {
            logEntry += `\nTool Calls: ${JSON.stringify(message.toolCalls, null, 2)}\n`;
        }
        if (message.toolResults) {
            logEntry += `\nTool Results: ${JSON.stringify(message.toolResults, null, 2)}\n`;
        }

        await fs.appendFile(sessionFile, logEntry, "utf-8");

        this.dirty = true;
    }

    /**
     * Recall context. Reads recent messages from session file and searches long-term memory.
     */
    async recall(
        channel: string,
        chatId: string,
        queryText: string,
        userId?: string
    ): Promise<MemoryContext> {
        const sessionId = `${channel}-${chatId}`;
        const sessionFile = path.join(this.options.workspaceDir, "memory", "sessions", `${sessionId}.md`);

        let recentMessages: ConversationMessage[] = [];
        try {
            const content = await fs.readFile(sessionFile, "utf-8").catch(() => "");
            if (content) {
                recentMessages = this.parseSessionFile(content, 20); // Last 20 messages
            }
        } catch (err) {
            console.warn(`[Memory] Failed to read/parse session file ${sessionFile}`, err);
        }

        const relevantHistory = await this.search(queryText, 8, {
            channel,
            chatId,
            boostSources: ["memory/todos", "memory/tasks", "memory/summaries"]
        });

        // Load user facts (from memory/facts.md)
        let userFacts: string[] = [];
        try {
            const factsFile = path.join(this.options.workspaceDir, "memory", "facts.md");
            const factsContent = await fs.readFile(factsFile, "utf-8").catch(() => "");
            if (factsContent) {
                const lines = factsContent.split("\n").map(l => l.trim()).filter(Boolean);
                const collect = (id: string) => lines.filter(l => l.includes(`User ${id}:`));
                const seen = new Set<string>();
                const addFacts = (facts: string[]) => {
                    for (const fact of facts) {
                        if (!seen.has(fact)) {
                            seen.add(fact);
                            userFacts.push(fact);
                        }
                    }
                };

                if (userId) {
                    addFacts(collect(userId));
                }

                if (chatId && chatId !== userId) {
                    addFacts(collect(chatId));
                }

                if (!userFacts.length && !userId && chatId) {
                    addFacts(collect(chatId));
                }
            }
        } catch (err) {
            console.warn("[Memory] Failed to read facts file", err);
        }

        const additionalContext: Array<{ id: string; content: string; score: number; metadata?: any }> = [];

        const pushFileTail = async (relPath: string, score: number) => {
            const filePath = path.join(this.options.workspaceDir, relPath);
            try {
                const content = await fs.readFile(filePath, "utf-8").catch(() => "");
                if (!content) return;
                const lines = content.split("\n").filter(Boolean);
                const tail = lines.slice(-20).join("\n");
                additionalContext.push({
                    id: relPath,
                    content: tail,
                    score,
                    metadata: { source: "memory" }
                });
            } catch { }
        };

        await pushFileTail("memory/todos.md", 0.65);
        await pushFileTail("memory/tasks.md", 0.6);
        await pushFileTail(`memory/summaries/${channel}-${chatId}.md`, 0.75);

        return {
            recentMessages,
            relevantHistory: [
                ...relevantHistory.map(r => ({
                    id: r.path, // Use path as ID
                    content: r.snippet,
                    score: r.score,
                    metadata: { source: r.source }
                })),
                ...additionalContext
            ].sort((a, b) => b.score - a.score),
            userFacts
        };
    }

    async saveSession(session: Session): Promise<void> {
        // Implemented via incremental remember() calls
    }

    async getProfile(userId: string): Promise<UserProfile | null> {
        // TODO: Implement file-based profile
        return { id: userId, preferences: {}, facts: [] };
    }

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
        // TODO: Implement file-based profile update
    }

    async addFact(userId: string, fact: string): Promise<void> {
        const factsFile = path.join(this.options.workspaceDir, "memory", "facts.md");
        await fs.appendFile(factsFile, `- User ${userId}: ${fact}\n`);
        this.dirty = true;
    }

    async getLastActiveConversation(): Promise<{ channel: string; chatId: string; userId?: string } | null> {
        const sessionDir = path.join(this.options.workspaceDir, "memory", "sessions");
        try {
            const files = await fs.readdir(sessionDir);
            if (files.length === 0) return null;

            let newestFile = "";
            let newestTime = 0;

            for (const file of files) {
                if (!file.endsWith(".md")) continue;
                const stat = await fs.stat(path.join(sessionDir, file));
                if (stat.mtimeMs > newestTime) {
                    newestTime = stat.mtimeMs;
                    newestFile = file;
                }
            }

            if (!newestFile) return null;

            // Filename format: channel-chatId.md
            const basename = path.parse(newestFile).name;
            // Basic split - beware of dashes in channel name
            const parts = basename.split('-');
            // Assume first part is channel 
            // e.g. telegram-123456
            if (parts.length >= 2) {
                const channel = parts[0];
                const chatId = parts.slice(1).join('-');
                return { channel, chatId, userId: chatId };
            }
        } catch { }
        return null;
    }

    private parseSessionFile(content: string, limit: number): ConversationMessage[] {
        // Simple parsers for ## TIMESTAMP - ROLE
        const regex = /^## (.*?) - (user|assistant|system|tool)\s*\n([\s\S]*?)(?=^## |\Z)/gm;
        const messages: ConversationMessage[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            try {
                messages.push({
                    timestamp: new Date(match[1]),
                    role: match[2] as any,
                    content: match[3].trim()
                });
            } catch { }
        }
        return messages.slice(-limit);
    }

    private async ensureVectorReady(dimensions?: number): Promise<boolean> {
        if (!this.vectorEnabled) return false;

        if (this.vectorAvailable === null) {
            const result = await loadSqliteVecExtension({ db: this.db });
            this.vectorAvailable = result.ok;
            if (!result.ok) {
                console.warn("Failed to load sqlite-vec extension:", result.error);
            }
        }

        if (!this.vectorAvailable) return false;

        if (dimensions && dimensions > 0) {
            if (this.vectorDims !== dimensions) {
                this.db.exec(
                    `CREATE VIRTUAL TABLE IF NOT EXISTS ${VECTOR_TABLE} USING vec0(\n` +
                    `  id TEXT PRIMARY KEY,\n` +
                    `  embedding FLOAT[${dimensions}]\n` +
                    `)`
                );
                this.vectorDims = dimensions;
            }
        }
        return true;
    }

    private ensureWatcher() {
        if (this.watcher) return;
        const paths = [
            path.join(this.options.workspaceDir, "MEMORY.md"),
            path.join(this.options.workspaceDir, "memory"),
            ...(this.options.extraPaths || [])
        ];

        this.watcher = chokidar.watch(paths, {
            ignoreInitial: true,
            persistent: true
        });

        const markDirty = () => { this.dirty = true; void this.sync(); };
        this.watcher.on("add", markDirty);
        this.watcher.on("change", markDirty);
        this.watcher.on("unlink", markDirty);
    }

    async sync(params?: { force?: boolean }): Promise<void> {
        if (this.syncing) return this.syncing;
        this.syncing = this.runSync(params).finally(() => { this.syncing = null; });
        return this.syncing;
    }

    private async runSync(params?: { force?: boolean }): Promise<void> {
        console.log("[Memory] Starting sync...");
        try {
            const files = await listMemoryFiles(this.options.workspaceDir, this.options.extraPaths);

            for (const filePath of files) {
                await this.syncFile(filePath);
            }

            console.log("[Memory] Sync complete.");
        } catch (err) {
            console.error("[Memory] Sync failed:", err);
        }
        this.dirty = false;
    }

    // NEW: Session file tracking for incremental sync
    private sessionDeltas = new Map<string, { lastSize: number }>();

    private async syncFile(absPath: string): Promise<void> {
        const entry = await buildFileEntry(absPath, this.options.workspaceDir);
        if (!entry) return; // File was deleted

        const isSessionFile = entry.path.startsWith("memory/sessions/");

        let startByte = 0;
        let isIncremental = false;

        if (isSessionFile) {
            const previousState = this.sessionDeltas.get(entry.path);
            if (previousState && entry.size > previousState.lastSize) {
                startByte = previousState.lastSize;
                isIncremental = true;
            } else if (previousState && entry.size < previousState.lastSize) {
                // File truncated, re-sync completely
                this.sessionDeltas.delete(entry.path);
            } else if (previousState && entry.size === previousState.lastSize) {
                return; // Unchanged strictly by size
            }
        }

        const existing = this.db.prepare("SELECT hash FROM files WHERE path = ?").get(entry.path) as { hash: string } | undefined;

        if (!isIncremental && existing && existing.hash === entry.hash) return; // Unchanged

        // Update file record
        this.db.prepare("INSERT OR REPLACE INTO files (path, hash, mtime, size) VALUES (?, ?, ?, ?)").run(
            entry.path, entry.hash, entry.mtimeMs, entry.size
        );

        const fileHandle = await fs.open(absPath, 'r');
        let contentToProcess = "";

        try {
            if (isIncremental) {
                const buffer = Buffer.alloc(entry.size - startByte);
                await fileHandle.read(buffer, 0, buffer.length, startByte);
                contentToProcess = buffer.toString("utf-8");
            } else {
                contentToProcess = await fileHandle.readFile("utf-8");
            }
        } finally {
            await fileHandle.close();
        }

        if (isSessionFile) {
            this.sessionDeltas.set(entry.path, { lastSize: entry.size });
        }

        if (!isIncremental) {
            // Delete old chunks entirely if full sync
            this.db.prepare("DELETE FROM chunks WHERE path = ?").run(entry.path);
            if (this.ftsEnabled && this.ftsAvailable) {
                this.db.prepare(`DELETE FROM ${FTS_TABLE} WHERE path = ?`).run(entry.path);
            }
        }

        // Chunking the content. If incremental, we pretend the start line is at the end of the existing file to avoid chunk overlap weirdness.
        // For simplicity, we just chunk the delta string as if it's the whole file. 
        // This is acceptable since session files are heavily append-only text logs.
        const chunks = chunkMarkdown(contentToProcess, { tokens: MAX_CHUNK_TOKENS, overlap: CHUNK_OVERLAP });

        // Embed chunks (with batch failure handling)
        const texts = chunks.map(c => c.text);
        let embeddings: number[][] = [];

        if (this.provider && this.vectorEnabled) {
            try {
                // Try batch embedding first
                if (this.batchFailureCount < this.BATCH_FAILURE_LIMIT) {
                    embeddings = await this.provider.embedBatch(texts);
                    // Reset failure count on success
                    this.batchFailureCount = 0;
                    this.batchFailureLastError = undefined;
                } else {
                    // Fall back to single-item embedding after repeated batch failures
                    console.warn(`[Memory] Batch embedding disabled after ${this.BATCH_FAILURE_LIMIT} failures, using single-item mode`);
                    embeddings = [];
                    for (const text of texts) {
                        const embedding = await this.provider.embedQuery(text);
                        embeddings.push(embedding);
                    }
                }
                await this.ensureVectorReady(embeddings[0]?.length || 0);
            } catch (error) {
                this.batchFailureCount++;
                this.batchFailureLastError = error instanceof Error ? error.message : String(error);
                console.error(`[Memory] Embedding failed (${this.batchFailureCount}/${this.BATCH_FAILURE_LIMIT}):`, error);

                // If we've hit the limit, continue without embeddings (FTS-only for this file)
                if (this.batchFailureCount >= this.BATCH_FAILURE_LIMIT) {
                    console.warn('[Memory] Switching to FTS-only mode for this sync due to repeated embedding failures');
                }
                embeddings = [];
            }
        }

        const insertChunk = this.db.prepare(
            "INSERT INTO chunks (id, path, start_line, end_line, hash, model, text, embedding, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        const insertFts = this.ftsEnabled && this.ftsAvailable
            ? this.db.prepare(`INSERT INTO ${FTS_TABLE} (id, path, text, start_line, end_line, model) VALUES (?, ?, ?, ?, ?, ?)`)
            : null;

        const insertVec = this.provider && this.vectorEnabled && this.vectorAvailable
            ? this.db.prepare(`INSERT INTO ${VECTOR_TABLE} (id, embedding) VALUES (?, ?)`)
            : null;

        const now = Date.now();
        const providerModel = this.provider?.model || 'none';

        this.db.transaction(() => {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const embedding = embeddings[i] || [];
                const id = `${entry.path}:${i}:${chunk.hash.substring(0, 8)}`; // Unique ID

                insertChunk.run(
                    id, entry.path, chunk.startLine, chunk.endLine, chunk.hash, providerModel, chunk.text, JSON.stringify(embedding), now
                );

                if (insertFts) {
                    insertFts.run(id, entry.path, chunk.text, chunk.startLine, chunk.endLine, providerModel);
                }

                if (insertVec && embedding.length > 0) {
                    // sqlite-vec expects Float32Array or buffer
                    insertVec.run(id, Buffer.from(new Float32Array(embedding).buffer));
                }
            }
        })();

        // Auto-generate summaries for session files to improve recall precision
        if (entry.path.startsWith("memory/sessions/")) {
            await this.writeSessionSummary(entry.path, contentToProcess);
        }
    }

    private async writeSessionSummary(relPath: string, content: string): Promise<void> {
        const sessionId = path.basename(relPath, ".md");
        const summaryDir = path.join(this.options.workspaceDir, "memory", "summaries");
        await fs.mkdir(summaryDir, { recursive: true });
        const summaryPath = path.join(summaryDir, `${sessionId}.md`);

        // Parse conversation blocks
        const regex = /^## (.*?) - (user|assistant|system|tool)\s*\n([\s\S]*?)(?=^## |\Z)/gm;
        const blocks: Array<{ role: string; text: string }> = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            blocks.push({ role: match[2], text: match[3].trim() });
        }

        const recent = blocks.slice(-12);
        const summaryLines = recent.map((b) => {
            const snippet = b.text.replace(/\s+/g, " ").slice(0, 180);
            return `- ${b.role}: ${snippet}`;
        });

        const summary = `# Session Summary: ${sessionId}\n\n` +
            `## Recent Highlights\n` +
            (summaryLines.length > 0 ? summaryLines.join("\n") : "- (no messages yet)");

        try {
            const existing = await fs.readFile(summaryPath, "utf-8").catch(() => "");
            if (existing.trim() === summary.trim()) return;
        } catch { }

        await fs.writeFile(summaryPath, summary, "utf-8");
    }

    async search(
        query: string,
        maxResults = 10,
        options?: { channel?: string; chatId?: string; boostSources?: string[] }
    ): Promise<MemorySearchResult[]> {
        const cleaned = query.trim();
        if (!cleaned) {
            return [];
        }

        const candidates = Math.max(20, maxResults * 2);
        const now = Date.now();

        // FTS-ONLY MODE: No embedding provider available
        if (!this.provider) {
            if (!this.ftsEnabled || !this.ftsAvailable) {
                console.warn('[Memory] No provider and FTS unavailable - search disabled');
                return [];
            }

            console.log('[Memory] Using FTS-only mode (no embedding provider)');

            // Extract keywords for better FTS matching on conversational queries
            // e.g., "that thing we discussed about the API" → ["API", "thing"]
            const keywords = extractKeywords(cleaned);
            const searchTerms = keywords.length > 0 ? keywords : [cleaned];

            console.log(`[Memory] Extracted keywords: ${keywords.join(', ') || '(none)'}`);

            // Search with each keyword and merge results
            const resultSets = await Promise.all(
                searchTerms.map((term) =>
                    searchKeyword({
                        db: this.db,
                        ftsTable: FTS_TABLE,
                        providerModel: 'fts-only',  // Special marker for FTS-only mode
                        query: term,
                        limit: candidates,
                        snippetMaxChars: SNIPPET_MAX_CHARS,
                        sourceFilter: { sql: "", params: [] },
                        buildFtsQuery: buildFtsQuery,
                        bm25RankToScore: bm25RankToScore
                    }).catch(() => [])
                )
            );

            // Merge and deduplicate results, keeping highest score for each chunk
            const seenIds = new Map<string, any>();
            for (const results of resultSets) {
                for (const result of results) {
                    const existing = seenIds.get(result.id);
                    if (!existing || result.score > existing.score) {
                        seenIds.set(result.id, result);
                    }
                }
            }

            const merged = [...seenIds.values()]
                .map(r => this.applyBoosts(r, now, options))
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);

            return merged;
        }

        // HYBRID MODE: Vector + FTS search
        const queryVec = await this.provider.embedQuery(query);
        const isVectorReady = await this.ensureVectorReady(queryVec.length);

        const vectorResults = isVectorReady
            ? await searchVector({
                db: this.db,
                vectorTable: VECTOR_TABLE,
                providerModel: this.provider.model,
                queryVec,
                limit: candidates,
                snippetMaxChars: SNIPPET_MAX_CHARS,
                ensureVectorReady: async (d) => await this.ensureVectorReady(d),
                sourceFilterVec: { sql: "", params: [] },
                sourceFilterChunks: { sql: "", params: [] }
            })
            : [];

        const keywordResults = (this.ftsEnabled && this.ftsAvailable)
            ? await searchKeyword({
                db: this.db,
                ftsTable: FTS_TABLE,
                providerModel: this.provider.model,
                query,
                limit: candidates,
                snippetMaxChars: SNIPPET_MAX_CHARS,
                sourceFilter: { sql: "", params: [] },
                buildFtsQuery: buildFtsQuery,
                bm25RankToScore: bm25RankToScore
            })
            : [];

        // Merge hybrid results
        const merged = mergeHybridResults({
            vector: vectorResults.map(r => ({ ...r, vectorScore: r.score })),
            keyword: keywordResults,
            vectorWeight: this.options.query?.hybrid?.vectorWeight ?? 0.7,
            textWeight: this.options.query?.hybrid?.textWeight ?? 0.3,
            mmr: this.options.query?.hybrid?.mmr
        });

        // Apply temporal decay and source boosting
        const boosted = merged
            .map(r => this.applyBoosts(r, now, options))
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);

        return boosted;
    }

    /**
     * Apply temporal decay and source-specific boosting to search results
     */
    private applyBoosts(
        result: any,
        now: number,
        options?: { channel?: string; chatId?: string; boostSources?: string[] }
    ): MemorySearchResult {
        let score = result.score;
        const channel = options?.channel;
        const chatId = options?.chatId;
        const boostSources = options?.boostSources || [];

        // Temporal decay: Recent memories get up to +20% boost
        if (result.mtimeMs) {
            const ageDays = Math.max(0, (now - result.mtimeMs) / (1000 * 60 * 60 * 24));
            const recencyBoost = Math.max(0, (30 - ageDays) / 30) * 0.2;
            score = score * (1 + recencyBoost);
        }

        // Current session boost: +20%
        if (channel && chatId) {
            const sessionPath = `memory/sessions/${channel}-${chatId}.md`;
            if (result.path === sessionPath) {
                score *= 1.2;
            }
        }

        // Source-specific boost: +15%
        if (boostSources.some((prefix) => result.path.startsWith(prefix))) {
            score *= 1.15;
        }

        return {
            ...result,
            score,
            source: result.source ?? 'memory'
        };
    }

    async close() {
        if (this.watcher) await this.watcher.close();
        this.db.close();
    }
}

