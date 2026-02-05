/**
 * Episodic Memory System
 * 
 * Stores and retrieves specific events/experiences (episodes) to help
 * the agent learn from past successes and failures.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

export type EpisodeType =
    | 'task_success'      // Successfully completed a task
    | 'task_failure'      // Failed to complete a task
    | 'user_feedback'     // User gave positive/negative feedback
    | 'error_resolved'    // Fixed an error (remember how)
    | 'pattern_learned';  // Learned a user preference or pattern

export interface Episode {
    id: string;
    timestamp: Date;
    type: EpisodeType;
    summary: string;          // Brief description of what happened
    context: string;          // What was the situation/task
    outcome: string;          // What was the result
    learning?: string;        // Key takeaway to remember
    tags?: string[];          // For categorization
    importance: number;       // 1-10 scale, higher = more important to remember
    embedding?: number[];     // For semantic search (optional)
}

export interface EpisodeSearchResult {
    episode: Episode;
    score: number;            // Relevance score
}

export interface EpisodicMemoryOptions {
    dbPath: string;
    maxEpisodes?: number;     // Limit total episodes (FIFO on low importance)
}

// ============================================================================
// EpisodicMemory Class
// ============================================================================

export class EpisodicMemory {
    private db: Database.Database;
    private maxEpisodes: number;

    constructor(options: EpisodicMemoryOptions) {
        this.db = new Database(options.dbPath);
        this.maxEpisodes = options.maxEpisodes || 1000;
        this.initSchema();
    }

    private initSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                summary TEXT NOT NULL,
                context TEXT NOT NULL,
                outcome TEXT NOT NULL,
                learning TEXT,
                tags TEXT,
                importance INTEGER DEFAULT 5,
                embedding BLOB
            );
            
            CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(type);
            CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance DESC);
            
            -- Full-text search for episodes
            CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
                summary, context, outcome, learning,
                content='episodes',
                content_rowid='rowid'
            );
            
            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
                INSERT INTO episodes_fts(rowid, summary, context, outcome, learning)
                VALUES (NEW.rowid, NEW.summary, NEW.context, NEW.outcome, NEW.learning);
            END;
            
            CREATE TRIGGER IF NOT EXISTS episodes_ad AFTER DELETE ON episodes BEGIN
                INSERT INTO episodes_fts(episodes_fts, rowid, summary, context, outcome, learning)
                VALUES ('delete', OLD.rowid, OLD.summary, OLD.context, OLD.outcome, OLD.learning);
            END;
        `);
    }

    /**
     * Remember a new episode
     */
    async remember(episode: Omit<Episode, 'id' | 'timestamp'>): Promise<Episode> {
        const fullEpisode: Episode = {
            ...episode,
            id: randomUUID(),
            timestamp: new Date(),
            importance: episode.importance ?? 5
        };

        const stmt = this.db.prepare(`
            INSERT INTO episodes (id, timestamp, type, summary, context, outcome, learning, tags, importance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            fullEpisode.id,
            fullEpisode.timestamp.toISOString(),
            fullEpisode.type,
            fullEpisode.summary,
            fullEpisode.context,
            fullEpisode.outcome,
            fullEpisode.learning || null,
            fullEpisode.tags ? JSON.stringify(fullEpisode.tags) : null,
            fullEpisode.importance
        );

        console.log(`📝 Episode remembered: [${fullEpisode.type}] ${fullEpisode.summary.substring(0, 50)}...`);

        // Prune if over limit
        await this.pruneOldEpisodes();

        return fullEpisode;
    }

    /**
     * Search for similar episodes using FTS
     */
    async recall(query: string, limit: number = 5): Promise<EpisodeSearchResult[]> {
        // Use FTS5 for fast text search
        const stmt = this.db.prepare(`
            SELECT e.*, bm25(episodes_fts) as score
            FROM episodes_fts
            JOIN episodes e ON e.rowid = episodes_fts.rowid
            WHERE episodes_fts MATCH ?
            ORDER BY score
            LIMIT ?
        `);

        try {
            const rows = stmt.all(query, limit) as any[];
            return rows.map(row => ({
                episode: this.rowToEpisode(row),
                score: Math.abs(row.score) // BM25 returns negative scores
            }));
        } catch (e) {
            // If FTS fails (bad query), fall back to LIKE search
            const fallbackStmt = this.db.prepare(`
                SELECT * FROM episodes
                WHERE summary LIKE ? OR context LIKE ? OR outcome LIKE ? OR learning LIKE ?
                ORDER BY importance DESC, timestamp DESC
                LIMIT ?
            `);
            const likeQuery = `%${query}%`;
            const rows = fallbackStmt.all(likeQuery, likeQuery, likeQuery, likeQuery, limit) as any[];
            return rows.map(row => ({
                episode: this.rowToEpisode(row),
                score: 1.0
            }));
        }
    }

    /**
     * Get episodes by type
     */
    async getByType(type: EpisodeType, limit: number = 10): Promise<Episode[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM episodes
            WHERE type = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        const rows = stmt.all(type, limit) as any[];
        return rows.map(row => this.rowToEpisode(row));
    }

    /**
     * Get recent episodes
     */
    async getRecent(limit: number = 10): Promise<Episode[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM episodes
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        const rows = stmt.all(limit) as any[];
        return rows.map(row => this.rowToEpisode(row));
    }

    /**
     * Get high-importance episodes (learnings)
     */
    async getImportant(minImportance: number = 7, limit: number = 20): Promise<Episode[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM episodes
            WHERE importance >= ?
            ORDER BY importance DESC, timestamp DESC
            LIMIT ?
        `);
        const rows = stmt.all(minImportance, limit) as any[];
        return rows.map(row => this.rowToEpisode(row));
    }

    /**
     * Delete an episode
     */
    async forget(id: string): Promise<boolean> {
        const stmt = this.db.prepare('DELETE FROM episodes WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Prune old low-importance episodes if over limit
     */
    private async pruneOldEpisodes(): Promise<void> {
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM episodes');
        const { count } = countStmt.get() as { count: number };

        if (count > this.maxEpisodes) {
            const toDelete = count - this.maxEpisodes;
            // Delete oldest, lowest importance episodes
            const deleteStmt = this.db.prepare(`
                DELETE FROM episodes WHERE id IN (
                    SELECT id FROM episodes
                    ORDER BY importance ASC, timestamp ASC
                    LIMIT ?
                )
            `);
            deleteStmt.run(toDelete);
            console.log(`🗑️ Pruned ${toDelete} old episodes`);
        }
    }

    private rowToEpisode(row: any): Episode {
        return {
            id: row.id,
            timestamp: new Date(row.timestamp),
            type: row.type as EpisodeType,
            summary: row.summary,
            context: row.context,
            outcome: row.outcome,
            learning: row.learning || undefined,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
            importance: row.importance
        };
    }

    /**
     * Get statistics about episodes
     */
    async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
        const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM episodes');
        const { count: total } = totalStmt.get() as { count: number };

        const byTypeStmt = this.db.prepare(`
            SELECT type, COUNT(*) as count FROM episodes GROUP BY type
        `);
        const byTypeRows = byTypeStmt.all() as { type: string; count: number }[];
        const byType: Record<string, number> = {};
        for (const row of byTypeRows) {
            byType[row.type] = row.count;
        }

        return { total, byType };
    }

    close(): void {
        this.db.close();
    }
}
