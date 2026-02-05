
import { Database } from "better-sqlite3";
import { cosineSimilarity, parseEmbedding, truncateUtf16Safe } from "./internal.js";

const vectorToBlob = (embedding: number[]): Buffer =>
    Buffer.from(new Float32Array(embedding).buffer);

export type SearchSource = string;

export type SearchRowResult = {
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: SearchSource;
    mtimeMs?: number;
};

export async function searchVector(params: {
    db: Database;
    vectorTable: string;
    providerModel: string;
    queryVec: number[];
    limit: number;
    snippetMaxChars: number;
    ensureVectorReady: (dimensions: number) => Promise<boolean>;
    sourceFilterVec: { sql: string; params: SearchSource[] };
    sourceFilterChunks: { sql: string; params: SearchSource[] };
}): Promise<SearchRowResult[]> {
    if (params.queryVec.length === 0 || params.limit <= 0) return [];
    if (await params.ensureVectorReady(params.queryVec.length)) {
        const rows = params.db
            .prepare(
                `SELECT c.id, c.path, c.start_line, c.end_line, c.text,\n` +
                `       c.source,\n` +
                `       f.mtime AS mtime_ms,\n` +
                `       vec_distance_cosine(v.embedding, ?) AS dist\n` +
                `  FROM ${params.vectorTable} v\n` +
                `  JOIN chunks c ON c.id = v.id\n` +
                `  JOIN files f ON f.path = c.path\n` +
                ` WHERE c.model = ?${params.sourceFilterVec.sql}\n` +
                ` ORDER BY dist ASC\n` +
                ` LIMIT ?`,
            )
            .all(
                vectorToBlob(params.queryVec),
                params.providerModel,
                ...params.sourceFilterVec.params,
                params.limit,
            ) as Array<{
                id: string;
                path: string;
                start_line: number;
                end_line: number;
                text: string;
                source: SearchSource;
                mtime_ms: number;
                dist: number;
            }>;
        return rows.map((row) => ({
            id: row.id,
            path: row.path,
            startLine: row.start_line,
            endLine: row.end_line,
            score: 1 - row.dist, // Cosine distance to similarity
            snippet: truncateUtf16Safe(row.text, params.snippetMaxChars),
            source: row.source,
            mtimeMs: row.mtime_ms,
        }));
    }

    // Fallback to JS cosine similarity if vector table not ready (shouldn't happen if ensureVectorReady passes)
    const candidates = listChunks({
        db: params.db,
        providerModel: params.providerModel,
        sourceFilter: params.sourceFilterChunks,
    });
    const scored = candidates
        .map((chunk) => ({
            chunk,
            score: cosineSimilarity(params.queryVec, chunk.embedding),
        }))
        .filter((entry) => Number.isFinite(entry.score));
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit)
        .map((entry) => ({
            id: entry.chunk.id,
            path: entry.chunk.path,
            startLine: entry.chunk.startLine,
            endLine: entry.chunk.endLine,
            score: entry.score,
            snippet: truncateUtf16Safe(entry.chunk.text, params.snippetMaxChars),
            source: entry.chunk.source,
        }));
}

export function listChunks(params: {
    db: Database;
    providerModel: string;
    sourceFilter: { sql: string; params: SearchSource[] };
}): Array<{
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    text: string;
    embedding: number[];
    source: SearchSource;
    mtimeMs?: number;
}> {
    const rows = params.db
        .prepare(
            `SELECT c.id, c.path, c.start_line, c.end_line, c.text, c.embedding, c.source, f.mtime AS mtime_ms\n` +
            `  FROM chunks c\n` +
            `  JOIN files f ON f.path = c.path\n` +
            ` WHERE model = ?${params.sourceFilter.sql}`,
        )
        .all(params.providerModel, ...params.sourceFilter.params) as Array<{
            id: string;
            path: string;
            start_line: number;
            end_line: number;
            text: string;
            embedding: string | Buffer;
            source: SearchSource;
            mtime_ms: number;
        }>;

    return rows.map((row) => ({
        id: row.id,
        path: row.path,
        startLine: row.start_line,
        endLine: row.end_line,
        text: row.text,
        embedding: parseEmbedding(row.embedding),
        source: row.source,
        mtimeMs: row.mtime_ms,
    }));
}

export async function searchKeyword(params: {
    db: Database;
    ftsTable: string;
    providerModel: string;
    query: string;
    limit: number;
    snippetMaxChars: number;
    sourceFilter: { sql: string; params: SearchSource[] };
    buildFtsQuery: (raw: string) => string | null;
    bm25RankToScore: (rank: number) => number;
}): Promise<Array<SearchRowResult & { textScore: number }>> {
    if (params.limit <= 0) return [];
    const ftsQuery = params.buildFtsQuery(params.query);
    if (!ftsQuery) return [];

    const rows = params.db
        .prepare(
            `SELECT c.id, c.path, c.source, c.start_line, c.end_line, c.text,\n` +
            `       f.mtime AS mtime_ms,\n` +
            `       bm25(${params.ftsTable}) AS rank\n` +
            `  FROM ${params.ftsTable} c\n` +
            `  JOIN files f ON f.path = c.path\n` +
            ` WHERE ${params.ftsTable} MATCH ? AND model = ?${params.sourceFilter.sql}\n` +
            ` ORDER BY rank ASC\n` +
            ` LIMIT ?`,
        )
        .all(ftsQuery, params.providerModel, ...params.sourceFilter.params, params.limit) as Array<{
            id: string;
            path: string;
            source: SearchSource;
            start_line: number;
            end_line: number;
            text: string;
            rank: number;
            mtime_ms: number;
        }>;

    return rows.map((row) => {
        const textScore = params.bm25RankToScore(row.rank);
        return {
            id: row.id,
            path: row.path,
            startLine: row.start_line,
            endLine: row.end_line,
            score: textScore,
            textScore,
            snippet: truncateUtf16Safe(row.text, params.snippetMaxChars),
            source: row.source,
            mtimeMs: row.mtime_ms,
        };
    });
}
