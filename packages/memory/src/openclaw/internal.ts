
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export type MemoryFileEntry = {
    path: string;
    absPath: string;
    mtimeMs: number;
    size: number;
    hash: string;
};

export type MemoryChunk = {
    id: string; // Add ID for easier tracking
    startLine: number;
    endLine: number;
    text: string;
    hash: string;
};

export function ensureDir(dir: string): string {
    try {
        if (!fsSync.existsSync(dir)) {
            fsSync.mkdirSync(dir, { recursive: true });
        }
    } catch { }
    return dir;
}

export function normalizeRelPath(value: string): string {
    const trimmed = value.trim().replace(/^[./]+/, "");
    return trimmed.replace(/\\/g, "/");
}

export function isMemoryPath(relPath: string): boolean {
    const normalized = normalizeRelPath(relPath);
    if (!normalized) return false;
    if (normalized === "MEMORY.md" || normalized === "memory.md") return true;
    return normalized.startsWith("memory/");
}

export async function listMemoryFiles(
    workspaceDir: string,
    extraPaths?: string[],
): Promise<string[]> {
    const result: string[] = [];
    const memoryFile = path.join(workspaceDir, "MEMORY.md");
    const altMemoryFile = path.join(workspaceDir, "memory.md");
    const memoryDir = path.join(workspaceDir, "memory");

    const addMarkdownFile = async (absPath: string) => {
        try {
            const stat = await fs.stat(absPath);
            if (stat.isFile() && absPath.endsWith(".md")) {
                result.push(absPath);
            }
        } catch { }
    };

    await addMarkdownFile(memoryFile);
    await addMarkdownFile(altMemoryFile);

    if (fsSync.existsSync(memoryDir)) {
        try {
            const files = await fs.readdir(memoryDir, { withFileTypes: true, recursive: true });
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                    // recursive readdir returns partial paths? Node 20+ supports recursive: true
                    // result.push(path.join(file.path, file.name)); 
                    // file.path is available in recent Node versions
                    // For safety with older Node generic types vs runtime:
                    const fullPath = path.join(file.parentPath || file.path, file.name);
                    result.push(fullPath);
                }
            }
        } catch (e) { console.error("Error reading memory dir", e); }
    }

    // TODO: Handle extraPaths if needed (omitted for now for simplicity as we focused on workspace)
    return Array.from(new Set(result));
}

export function hashText(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
}

export async function buildFileEntry(
    absPath: string,
    workspaceDir: string,
): Promise<MemoryFileEntry> {
    const stat = await fs.stat(absPath);
    const content = await fs.readFile(absPath, "utf-8");
    const hash = hashText(content);
    return {
        path: path.relative(workspaceDir, absPath).replace(/\\/g, "/"),
        absPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash,
    };
}

export function chunkMarkdown(
    content: string,
    chunking: { tokens: number; overlap: number },
): MemoryChunk[] {
    const lines = content.split("\n");
    if (lines.length === 0) return [];
    const maxChars = Math.max(32, chunking.tokens * 4);
    const overlapChars = Math.max(0, chunking.overlap * 4);
    const chunks: MemoryChunk[] = [];

    let current: Array<{ line: string; lineNo: number }> = [];
    let currentChars = 0;

    const flush = () => {
        if (current.length === 0) return;
        const firstEntry = current[0];
        const lastEntry = current[current.length - 1];
        if (!firstEntry || !lastEntry) return;
        const text = current.map((entry) => entry.line).join("\n");
        const startLine = firstEntry.lineNo;
        const endLine = lastEntry.lineNo;
        const hash = hashText(text);
        chunks.push({
            id: hash.substring(0, 12), // Generate ID from hash
            startLine,
            endLine,
            text,
            hash,
        });
    };

    const carryOverlap = () => {
        if (overlapChars <= 0 || current.length === 0) {
            current = [];
            currentChars = 0;
            return;
        }
        let acc = 0;
        const kept: Array<{ line: string; lineNo: number }> = [];
        for (let i = current.length - 1; i >= 0; i -= 1) {
            const entry = current[i];
            if (!entry) continue;
            acc += entry.line.length + 1;
            kept.unshift(entry);
            if (acc >= overlapChars) break;
        }
        current = kept;
        currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? "";
        const lineNo = i + 1;
        const segments: string[] = [];
        if (line.length === 0) {
            segments.push("");
        } else {
            for (let start = 0; start < line.length; start += maxChars) {
                segments.push(line.slice(start, start + maxChars));
            }
        }
        for (const segment of segments) {
            const lineSize = segment.length + 1;
            if (currentChars + lineSize > maxChars && current.length > 0) {
                flush();
                carryOverlap();
            }
            current.push({ line: segment, lineNo });
            currentChars += lineSize;
        }
    }
    flush();
    return chunks;
}

export function parseEmbedding(raw: string | Buffer): number[] {
    if (Buffer.isBuffer(raw)) {
        return Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4));
    }
    try {
        const parsed = JSON.parse(raw as string) as number[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i += 1) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        dot += av * bv;
        normA += av * av;
        normB += bv * bv;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function truncateUtf16Safe(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + "...";
}
