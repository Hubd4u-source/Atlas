
export interface EmbeddingProvider {
    id: string;
    model: string;
    embedQuery: (text: string) => Promise<number[]>;
    embedBatch: (texts: string[]) => Promise<number[][]>;
}

export interface EmbeddingOptions {
    provider: 'openai' | 'mock'; // Add gemini/local later
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

export function createEmbeddingProvider(options: EmbeddingOptions): EmbeddingProvider {
    if (options.provider === 'openai') {
        return new OpenAIEmbeddingProvider(options);
    }
    return new MockEmbeddingProvider();
}

export class MockEmbeddingProvider implements EmbeddingProvider {
    id = "mock";
    model = "mock-model";

    async embedQuery(text: string): Promise<number[]> {
        // Return a mock vector of dimension 1536 (OpenAI default) to avoid errors if switched later
        // or 384 for small models. Let's stick to 128 for speed/size in mock.
        // Wait, if we use sqlite-vec, dimensions must match table creation.
        // memory.ts initializes table based on first embedding.
        return new Array(1536).fill(0).map(() => Math.random() * 0.1);
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return Promise.all(texts.map(t => this.embedQuery(t)));
    }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    id = "openai";
    model: string;
    private apiKey: string;
    private baseUrl: string;

    constructor(options: EmbeddingOptions) {
        this.model = options.model || "text-embedding-3-small";
        this.apiKey = options.apiKey || "";
        this.baseUrl = options.baseUrl || "https://api.openai.com/v1";

        if (!this.apiKey) {
            console.warn("[OpenAIEmbeddingProvider] No API Key provided. Calls will fail.");
        }
    }

    async embedQuery(text: string): Promise<number[]> {
        const result = await this.callOpenAI([text]);
        return result[0] || [];
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return this.callOpenAI(texts);
    }

    private async callOpenAI(inputs: string[]): Promise<number[][]> {
        if (inputs.length === 0) return [];

        // Remove trailing slash from base URL if present
        const baseUrl = this.baseUrl.replace(/\/$/, "");
        const url = `${baseUrl}/embeddings`;
        console.log(`[OpenAIEmbedding] POST ${url}`);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    input: inputs
                })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`OpenAI Embeddings API Error: ${res.status} ${txt}`);
            }

            const json = await res.json() as { data: { embedding: number[] }[] };
            return json.data.map(d => d.embedding);
        } catch (err) {
            console.error("Embedding failed", err);
            throw err;
        }
    }
}
