
export type HybridSource = string;

export type HybridVectorResult = {
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    source: HybridSource;
    snippet: string;
    vectorScore: number;
    mtimeMs?: number;
};

export type HybridKeywordResult = {
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    source: HybridSource;
    snippet: string;
    textScore: number;
    mtimeMs?: number;
};

export function buildFtsQuery(raw: string): string | null {
    const tokens =
        raw
            .match(/[A-Za-z0-9_]+/g)
            ?.map((t) => t.trim())
            .filter(Boolean) ?? [];
    if (tokens.length === 0) return null;
    const quoted = tokens.map((t) => `"${t.replaceAll('"', "")}"`);
    return quoted.join(" AND ");
}

export function bm25RankToScore(rank: number): number {
    const normalized = Number.isFinite(rank) ? Math.max(0, rank) : 999;
    return 1 / (1 + normalized);
}

export function mergeHybridResults(params: {
    vector: HybridVectorResult[];
    keyword: HybridKeywordResult[];
    vectorWeight: number;
    textWeight: number;
    mmr?: { enabled: boolean; lambda: number };
}): Array<{
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: HybridSource;
    mtimeMs?: number;
}> {
    const byId = new Map<
        string,
        {
            id: string;
            path: string;
            startLine: number;
            endLine: number;
            source: HybridSource;
            snippet: string;
            vectorScore: number;
            textScore: number;
            mtimeMs?: number;
        }
    >();

    for (const r of params.vector) {
        byId.set(r.id, {
            id: r.id,
            path: r.path,
            startLine: r.startLine,
            endLine: r.endLine,
            source: r.source,
            snippet: r.snippet,
            vectorScore: r.vectorScore,
            textScore: 0,
            mtimeMs: r.mtimeMs,
        });
    }

    for (const r of params.keyword) {
        const existing = byId.get(r.id);
        if (existing) {
            existing.textScore = r.textScore;
            if (r.snippet && r.snippet.length > 0) existing.snippet = r.snippet;
            if (r.mtimeMs && (!existing.mtimeMs || r.mtimeMs > existing.mtimeMs)) {
                existing.mtimeMs = r.mtimeMs;
            }
        } else {
            byId.set(r.id, {
                id: r.id,
                path: r.path,
                startLine: r.startLine,
                endLine: r.endLine,
                source: r.source,
                snippet: r.snippet,
                vectorScore: 0,
                textScore: r.textScore,
                mtimeMs: r.mtimeMs,
            });
        }
    }

    let merged = Array.from(byId.values()).map((entry) => {
        const score = params.vectorWeight * entry.vectorScore + params.textWeight * entry.textScore;
        return {
            path: entry.path,
            startLine: entry.startLine,
            endLine: entry.endLine,
            score,
            snippet: entry.snippet,
            source: entry.source,
            mtimeMs: entry.mtimeMs,
        };
    });

    merged = merged.sort((a, b) => b.score - a.score);

    // Apply MMR (Maximal Marginal Relevance) if enabled
    if (params.mmr?.enabled && merged.length > 1) {
        const lambda = params.mmr.lambda;
        const selected: typeof merged = [];
        const candidates = [...merged];

        // Ensure maxScore is at least a small positive number to prevent NaNs
        const maxScore = Math.max(merged[0]?.score || 1, 0.0001);

        // Take the top result unconditionally as the anchor
        selected.push(candidates.shift()!);

        while (candidates.length > 0) {
            let bestScore = -Infinity;
            let bestIndex = -1;

            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                // Similarity penalty: how close is this candidate's path to already selected paths?
                let maxSimilarity = 0;
                for (const sel of selected) {
                    if (sel.path === candidate.path) {
                        // High penalty if it's the exact same file
                        maxSimilarity = Math.max(maxSimilarity, 0.8);
                        // Extreme penalty if it overlaps significantly
                        if (Math.abs(sel.startLine - candidate.startLine) < 50) {
                            maxSimilarity = Math.max(maxSimilarity, 1.0);
                        }
                    } else if (sel.path.split('/').slice(0, -1).join('/') === candidate.path.split('/').slice(0, -1).join('/')) {
                        // Modest penalty if it is in the same directory
                        maxSimilarity = Math.max(maxSimilarity, 0.3);
                    }
                }

                // MMR Equation: lambda * (Normalized Score) - (1 - lambda) * (Max Similarity to selected)
                // We normalize candidate score against max score to bound it [0, 1]
                const normalizedScore = candidate.score / maxScore;
                const mmrScore = lambda * normalizedScore - (1 - lambda) * maxSimilarity;

                if (mmrScore > bestScore) {
                    bestScore = mmrScore;
                    bestIndex = i;
                }
            }

            if (bestIndex !== -1) {
                const chosen = candidates[bestIndex];
                // Persist the original ranking score, but order them by MMR inclusion
                selected.push(chosen);
                candidates.splice(bestIndex, 1);
            } else {
                // Fallback (shouldn't happen with valid math, but just in case)
                selected.push(candidates.shift()!);
            }
        }

        // Return re-ordered array, keeping their individual final score prop intact
        return selected;
    }

    return merged;
}
