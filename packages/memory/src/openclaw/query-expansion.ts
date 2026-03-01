/**
 * Query Expansion - Extract keywords from conversational queries
 * Improves FTS search relevance for natural language queries
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'we', 'what', 'when', 'where', 'who',
    'why', 'how', 'this', 'these', 'those', 'can', 'could', 'should',
    'would', 'do', 'does', 'did', 'have', 'had', 'been', 'being',
    'about', 'after', 'before', 'between', 'into', 'through', 'during',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'all', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'but', 'if', 'or', 'because', 'until', 'while', 'i', 'you', 'your',
    'me', 'my', 'our', 'their', 'them', 'they', 'his', 'her', 'him',
    'us', 'thing', 'things', 'something', 'anything', 'everything',
    'discussed', 'talked', 'mentioned', 'said', 'told', 'asked'
]);

/**
 * Extract meaningful keywords from a conversational query
 * 
 * Examples:
 * - "what was that API thing we discussed?" → ["API"]
 * - "the database configuration from yesterday" → ["database", "configuration", "yesterday"]
 * - "that React component we built" → ["React", "component", "built"]
 * 
 * @param query - The conversational query to extract keywords from
 * @returns Array of extracted keywords (empty if no meaningful keywords found)
 */
export function extractKeywords(query: string): string[] {
    if (!query || typeof query !== 'string') {
        return [];
    }

    // Normalize: lowercase and remove punctuation
    const normalized = query
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) {
        return [];
    }

    // Split into words
    const words = normalized.split(' ');

    // Filter out stop words and short words (< 3 chars)
    const keywords = words.filter(word => {
        if (word.length < 3) return false;
        if (STOP_WORDS.has(word)) return false;
        return true;
    });

    // Deduplicate while preserving order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const keyword of keywords) {
        if (!seen.has(keyword)) {
            seen.add(keyword);
            unique.push(keyword);
        }
    }

    return unique;
}

/**
 * Expand a query with synonyms and related terms (future enhancement)
 * Currently returns the original query, but can be extended with:
 * - Synonym expansion (API → interface, endpoint)
 * - Stemming (running → run)
 * - Acronym expansion (DB → database)
 */
export function expandQuery(query: string): string[] {
    // For now, just return the original query
    // Future: Add synonym expansion, stemming, etc.
    return [query];
}
