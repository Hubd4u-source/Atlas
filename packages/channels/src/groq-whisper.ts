/**
 * Groq Whisper Transcription Service
 * 
 * Uses Groq's whisper-large-v3-turbo model to transcribe audio.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface GroqWhisperOptions {
    apiKey: string;
    model?: string;
}

export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
}

export class GroqWhisperService {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

    constructor(options: GroqWhisperOptions) {
        this.apiKey = options.apiKey;
        this.model = options.model || 'whisper-large-v3-turbo';
    }

    /**
     * Transcribe audio from a URL
     */
    async transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
        console.log(`🎤 Downloading audio from: ${audioUrl}`);

        // Download the audio file
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.status}`);
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // Save to temp file (Groq API requires file upload)
        const tempPath = path.join(os.tmpdir(), `whisper_${Date.now()}.ogg`);
        await fs.writeFile(tempPath, audioBuffer);

        try {
            const result = await this.transcribeFromFile(tempPath);
            return result;
        } finally {
            // Cleanup temp file
            await fs.unlink(tempPath).catch(() => { });
        }
    }

    /**
     * Transcribe audio from a file path
     */
    async transcribeFromFile(filePath: string): Promise<TranscriptionResult> {
        console.log(`🎤 Transcribing audio file: ${filePath}`);

        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);

        // Create form data
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), fileName);
        formData.append('model', this.model);
        formData.append('response_format', 'json');

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq Whisper API error: ${response.status} - ${error}`);
        }

        const result = await response.json() as { text?: string; language?: string; duration?: number };

        console.log(`✅ Transcription complete: "${result.text?.substring(0, 50)}..."`);

        return {
            text: result.text || '',
            language: result.language,
            duration: result.duration
        };
    }

    /**
     * Transcribe audio from a buffer
     */
    async transcribeFromBuffer(buffer: Buffer, mimeType: string = 'audio/ogg'): Promise<TranscriptionResult> {
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp3') ? 'mp3' : 'wav';
        const tempPath = path.join(os.tmpdir(), `whisper_${Date.now()}.${ext}`);

        await fs.writeFile(tempPath, buffer);

        try {
            return await this.transcribeFromFile(tempPath);
        } finally {
            await fs.unlink(tempPath).catch(() => { });
        }
    }
}

// Singleton instance
let whisperService: GroqWhisperService | null = null;

export function initGroqWhisper(apiKey: string, model?: string): GroqWhisperService {
    whisperService = new GroqWhisperService({ apiKey, model });
    console.log(`🎤 Groq Whisper initialized (model: ${model || 'whisper-large-v3-turbo'})`);
    return whisperService;
}

export function getGroqWhisper(): GroqWhisperService | null {
    return whisperService;
}
