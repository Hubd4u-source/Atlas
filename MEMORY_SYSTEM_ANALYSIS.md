# Atlas Memory System Analysis & Improvement Plan

## Executive Summary

After analyzing OpenClaw's reference implementation and Atlas's current memory system, I've identified **7 critical gaps** that are limiting Atlas's memory capabilities. This document outlines the issues and provides a detailed improvement roadmap.

---

## Critical Gaps Identified

### 1. **FTS-Only Mode Missing** ❌
**Problem:** Atlas requires embeddings to function. If the embedding provider fails (Kiro doesn't support embeddings), memory search completely breaks.

**OpenClaw Solution:** Graceful fallback to FTS-only mode with keyword extraction for conversational queries.

```typescript
// OpenClaw: Handles no-provider gracefully
if (!this.provider) {
  const keywords = extractKeywords(cleaned); // "that API thing" → ["API", "thing"]
  const searchTerms = keywords.length > 0 ? keywords : [cleaned];
  // Search with each keyword and merge results
}
```

**Impact:** HIGH - Atlas becomes unusable when embeddings fail.

---

### 2. **No Query Expansion** ❌
**Problem:** Atlas searches with raw user queries. Conversational queries like "that thing we discussed about the API" fail to match "API documentation" in memory.

**OpenClaw Solution:** Keyword extraction from conversational queries before FTS search.

```typescript
// packages/memory/src/openclaw/query-expansion.ts (MISSING)
export function extractKeywords(query: string): string[] {
  // Remove stop words, extract meaningful terms
  // "what was that API we discussed?" → ["API", "discussed"]
}
```

**Impact:** MEDIUM - Poor search relevance for natural language queries.

---

### 3. **Session Summaries Not Auto-Generated** ❌
**Problem:** Atlas stores raw session files but doesn't create searchable summaries. Long conversations become unsearchable noise.

**OpenClaw Solution:** Auto-generate summaries for session files to improve recall precision.

```typescript
// Atlas: Missing this critical feature
private async writeSessionSummary(relPath: string, content: string): Promise<void> {
  const sessionId = path.basename(relPath, ".md");
  const summaryDir = path.join(this.workspaceDir, "memory", "summaries");
  
  // Parse conversation blocks and create summary
  const recent = blocks.slice(-12);
  const summary = `# Session Summary: ${sessionId}\n\n` +
    `## Recent Highlights\n` +
    summaryLines.join("\n");
    
  await fs.writeFile(summaryPath, summary, "utf-8");
}
```

**Impact:** HIGH - Long conversations are effectively lost in memory.

---

### 4. **No Temporal Decay / Recency Boosting** ❌
**Problem:** Atlas treats all memories equally. Recent conversations should be weighted higher than old ones.

**OpenClaw Solution:** Temporal decay with configurable half-life + recency boosting.

```typescript
// OpenClaw: Boosts recent memories
const applyBoosts = (result: any) => {
  let score = result.score;
  
  // Recency boost (up to +20%)
  if (result.mtimeMs) {
    const ageDays = (now - result.mtimeMs) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, (30 - ageDays) / 30) * 0.2;
    score = score * (1 + recencyBoost);
  }
  
  // Source-specific boosting
  if (boostSources.some((prefix) => result.path.startsWith(prefix))) {
    score *= 1.15;
  }
  
  return score;
};
```

**Impact:** MEDIUM - Stale memories pollute search results.

---

### 5. **No MMR (Maximal Marginal Relevance)** ❌
**Problem:** Atlas returns duplicate/similar results. If 5 chunks from the same file match, all 5 are returned instead of diverse results.

**OpenClaw Solution:** MMR algorithm to diversify search results.

```typescript
// OpenClaw: Diversifies results
mmr: {
  enabled: true,
  lambda: 0.5  // Balance relevance vs diversity
}
```

**Impact:** MEDIUM - Search results lack diversity.

---

### 6. **Batch Embedding Failures Not Handled** ❌
**Problem:** Atlas doesn't handle batch embedding failures gracefully. One bad chunk can break the entire sync.

**OpenClaw Solution:** Batch failure tracking with automatic fallback to single-item mode.

```typescript
// OpenClaw: Tracks batch failures
protected batchFailureCount = 0;
const BATCH_FAILURE_LIMIT = 2;

// After 2 batch failures, fall back to single-item embedding
if (this.batchFailureCount >= BATCH_FAILURE_LIMIT) {
  // Process one at a time
}
```

**Impact:** MEDIUM - Sync failures are hard to recover from.

---

### 7. **No Incremental Session Sync** ❌
**Problem:** Atlas re-syncs entire session files on every change. For active conversations, this is wasteful and slow.

**OpenClaw Solution:** Track session deltas and only sync new content.

```typescript
// OpenClaw: Incremental session sync
protected sessionDeltas = new Map<string, {
  lastSize: number;
  pendingBytes: number;
  pendingMessages: number;
}>();

// Only sync the delta since last sync
const delta = currentSize - lastSize;
if (delta > 0) {
  // Only process new content
}
```

**Impact:** LOW - Performance issue for active sessions.

---

## Improvement Roadmap

### Phase 1: Critical Fixes (Week 1)
**Priority: P0 - System Stability**

1. **Implement FTS-Only Mode**
   - Add `providerUnavailableReason` tracking
   - Graceful fallback when no embedding provider
   - Update search logic to handle null provider

2. **Add Query Expansion**
   - Create `query-expansion.ts` with keyword extraction
   - Integrate into FTS search path
   - Add stop words list

3. **Auto-Generate Session Summaries**
   - Hook into `syncFile()` for session files
   - Parse conversation blocks
   - Write summaries to `memory/summaries/`

### Phase 2: Search Quality (Week 2)
**Priority: P1 - User Experience**

4. **Implement Temporal Decay**
   - Add `mtimeMs` to search results
   - Apply recency boosting in `mergeHybridResults`
   - Make half-life configurable

5. **Add MMR Diversification**
   - Implement MMR algorithm in `hybrid.ts`
   - Add `lambda` parameter for relevance/diversity balance
   - Deduplicate by file path

### Phase 3: Robustness (Week 3)
**Priority: P2 - Reliability**

6. **Batch Failure Handling**
   - Track batch failure count
   - Automatic fallback to single-item mode
   - Reset counter on success

7. **Incremental Session Sync**
   - Track session file sizes
   - Only sync deltas
   - Optimize for active conversations

---

## Configuration Changes Needed

```typescript
// packages/memory/src/openclaw/memory.ts
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
    fallbackToFts?: boolean;  // NEW: Allow FTS-only mode
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
      mmr?: {  // NEW: MMR configuration
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
```

---

## Testing Strategy

### Unit Tests
- [ ] FTS-only mode with no provider
- [ ] Query expansion with conversational queries
- [ ] Session summary generation
- [ ] Temporal decay calculations
- [ ] MMR diversification
- [ ] Batch failure recovery
- [ ] Incremental sync delta tracking

### Integration Tests
- [ ] End-to-end search with FTS-only
- [ ] Hybrid search with temporal boosting
- [ ] Session file sync with summaries
- [ ] Batch embedding with failures
- [ ] Active session incremental sync

### Performance Tests
- [ ] Search latency with 10K chunks
- [ ] Sync time for 100 session files
- [ ] Memory usage during batch embedding
- [ ] Incremental sync vs full sync

---

## Migration Path

### Step 1: Backward Compatibility
- All new features are opt-in via config
- Existing deployments continue to work
- No breaking changes to API

### Step 2: Gradual Rollout
1. Deploy FTS-only mode (critical fix)
2. Enable query expansion (improves existing searches)
3. Add session summaries (new feature, no impact)
4. Enable temporal decay (opt-in)
5. Enable MMR (opt-in)
6. Enable batch failure handling (automatic)
7. Enable incremental sync (automatic optimization)

### Step 3: Documentation
- Update memory system docs
- Add troubleshooting guide for FTS-only mode
- Document new configuration options
- Provide migration examples

---

## Success Metrics

### Before Improvements
- ❌ Memory search fails when embeddings unavailable
- ❌ Conversational queries have poor relevance
- ❌ Long sessions are unsearchable
- ❌ Search results lack diversity
- ❌ Batch failures break sync

### After Improvements
- ✅ Memory search works in FTS-only mode
- ✅ Conversational queries extract keywords
- ✅ Session summaries improve recall
- ✅ Recent memories are prioritized
- ✅ Search results are diverse
- ✅ Batch failures are handled gracefully
- ✅ Active sessions sync incrementally

---

## Estimated Effort

| Phase | Tasks | Effort | Priority |
|-------|-------|--------|----------|
| Phase 1 | FTS-only, Query Expansion, Session Summaries | 3-4 days | P0 |
| Phase 2 | Temporal Decay, MMR | 2-3 days | P1 |
| Phase 3 | Batch Handling, Incremental Sync | 2-3 days | P2 |
| **Total** | **7 improvements** | **7-10 days** | - |

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize Phase 1** (critical fixes)
3. **Create implementation tickets** for each improvement
4. **Set up testing infrastructure** for memory system
5. **Begin implementation** starting with FTS-only mode

---

## References

- OpenClaw Memory System: `openclaw-reference/src/memory/`
- Atlas Memory System: `packages/memory/src/openclaw/`
- Hybrid Search: `packages/memory/src/openclaw/hybrid.ts`
- Memory Manager: `packages/memory/src/openclaw/manager-search.ts`

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-01  
**Author:** Atlas AI Analysis
