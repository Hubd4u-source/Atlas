/**
 * Telegram Channel - Telegraf-based Telegram Bot adapter
 */

import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { BaseChannel, ChannelOptions } from './base-channel.js';
import type { MessageContent } from '@atlas/core';
import { getGroqWhisper } from './groq-whisper.js';

export interface TelegramOptions extends ChannelOptions {
    token: string;
    allowedUsers?: string[]; // Optional allowlist of user IDs
    adminUsers?: string[];   // Admin users who can use all commands
}

export class TelegramChannel extends BaseChannel {
    private bot: Telegraf;
    private telegramOptions: TelegramOptions;

    constructor(options: TelegramOptions) {
        super('telegram', options);
        this.telegramOptions = options;
        this.bot = new Telegraf(options.token);
        this.setupHandlers();
    }

    /**
     * Set up Telegram message handlers
     */
    private setupHandlers(): void {
        // Handle text messages
        this.bot.on(message('text'), async (ctx) => {
            await this.handleTextMessage(ctx);
        });

        // Handle photo messages
        this.bot.on(message('photo'), async (ctx) => {
            await this.handlePhotoMessage(ctx);
        });

        // Handle document messages
        this.bot.on(message('document'), async (ctx) => {
            await this.handleDocumentMessage(ctx);
        });

        // Handle voice messages
        this.bot.on(message('voice'), async (ctx) => {
            await this.handleVoiceMessage(ctx);
        });

        // Handle errors
        this.bot.catch((err) => {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        });

        // Built-in commands
        this.bot.command('start', async (ctx) => {
            await ctx.reply(
                '🚀 Welcome to Atlas AI Assistant!\n\n' +
                'I\'m your personal AI assistant. Just send me a message to get started.\n\n' +
                'Commands:\n' +
                '/help - Show help\n' +
                '/clear - Clear conversation history\n' +
                '/status - Show status'
            );
        });

        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '📖 Atlas AI Assistant Help\n\n' +
                'Just send me any message and I\'ll respond!\n\n' +
                'I can help you with:\n' +
                '• Answering questions\n' +
                '• Writing and editing text\n' +
                '• Code assistance\n' +
                '• File operations (with tools)\n' +
                '• And much more!\n\n' +
                'Commands:\n' +
                '/clear - Clear conversation history\n' +
                '/clearcontext - Clear all memory and start fresh\n' +
                '/status - Show bot status\n' +
                '/tasks - Show queued tasks'
            );
        });

        // Clear conversation history
        this.bot.command('clear', async (ctx) => {
            const chatId = String(ctx.chat?.id);
            this.emit('clear', chatId);
            await ctx.reply('🧹 Conversation history cleared! Starting fresh.');
        });

        // Show task queue status
        this.bot.command('tasks', async (ctx) => {
            const chatId = String(ctx.chat?.id);
            this.emit('tasks', chatId);
        });

        // Clear all context (memory + TODOs)
        this.bot.command('clearcontext', async (ctx) => {
            const chatId = String(ctx.chat?.id);
            this.emit('clearcontext', chatId);
            await ctx.reply('🔄 All context cleared!\n\n✅ Conversation history: Cleared\n✅ Active TODOs: Abandoned\n✅ Memory: Reset\n\nStarting completely fresh!');
        });

        // DEBUG: Test voice sending manually
        this.bot.command('debugvoice', async (ctx) => {
            const chatId = String(ctx.chat?.id);
            await ctx.reply("🕵️ Debugging Voice Sending...");

            // 1. Try hardcoded path from user report (if exists)
            // Note: User provided path had a timestamp, checking potential location
            const testDir = 'd:/Projects/AGI/atlas/apps/gateway/temp/voice';

            try {
                const fs = await import('fs');
                const path = await import('path');

                if (fs.existsSync(testDir)) {
                    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.mp3'));
                    if (files.length > 0) {
                        const lastFile = files[files.length - 1]; // Pick latest
                        const fullPath = path.join(testDir, lastFile);

                        await ctx.reply(`📂 Found audio file: ${lastFile}\n🚀 Attempting to send...`);
                        await ctx.replyWithVoice({ source: fullPath });
                        await ctx.reply("✅ Sent successfully via ctx.replyWithVoice");
                    } else {
                        await ctx.reply(`⚠️ No MP3 files found in ${testDir}`);
                    }
                } else {
                    await ctx.reply(`❌ Directory not found: ${testDir}`);
                }
            } catch (e: any) {
                await ctx.reply(`❌ Error sending voice: ${e.message}`);
                console.error(e);
            }
        });
    }

    /**
     * Check if a user is allowed to use the bot
     */
    private isUserAllowed(userId: number): boolean {
        if (!this.telegramOptions.allowedUsers || this.telegramOptions.allowedUsers.length === 0) {
            return true; // No allowlist = anyone can use
        }
        return this.telegramOptions.allowedUsers.includes(String(userId));
    }

    /**
     * Handle text messages
     */
    private async handleTextMessage(ctx: Context & { message: { text: string } }): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId || !this.isUserAllowed(userId)) {
            return;
        }

        const chatId = String(ctx.chat?.id);
        const text = ctx.message.text;

        // Skip commands (handled separately)
        if (text.startsWith('/')) return;

        const message = this.createIncomingMessage(
            chatId,
            { text },
            {
                userId: String(userId),
                username: ctx.from?.username,
                displayName: ctx.from?.first_name,
                replyToMessageId: (ctx.message as { reply_to_message?: { message_id: number } }).reply_to_message?.message_id?.toString(),
                isGroupChat: ctx.chat?.type !== 'private',
                mentionedBot: text.includes(`@${ctx.botInfo?.username}`)
            }
        );

        this.emit('message', message);
    }

    /**
     * Handle photo messages - download and convert to base64 for vision models
     */
    private async handlePhotoMessage(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        const msg = ctx.message as { photo?: { file_id: string }[], caption?: string };

        if (!userId || !this.isUserAllowed(userId) || !msg.photo) {
            return;
        }

        const chatId = String(ctx.chat?.id);
        const photo = msg.photo[msg.photo.length - 1]; // Get largest photo
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);

        // Download image and convert to base64 (Kiro API requires base64, not URLs)
        let imageData: string | undefined;
        try {
            const response = await fetch(fileLink.href);
            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                imageData = buffer.toString('base64');
                console.log(`🖼️ Downloaded image: ${buffer.length} bytes -> base64`);
            }
        } catch (error) {
            console.error('Failed to download image:', error);
        }

        const message = this.createIncomingMessage(
            chatId,
            {
                text: msg.caption || 'What is in this image?',
                image: {
                    url: fileLink.href,
                    data: imageData,  // Base64 for Kiro API
                    mimeType: 'image/jpeg'
                }
            },
            {
                userId: String(userId),
                username: ctx.from?.username,
                displayName: ctx.from?.first_name
            }
        );

        this.emit('message', message);
    }

    /**
     * Handle document messages
     */
    private async handleDocumentMessage(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        const msg = ctx.message as { document?: { file_id: string, file_name?: string, mime_type?: string }, caption?: string };

        if (!userId || !this.isUserAllowed(userId) || !msg.document) {
            return;
        }

        const chatId = String(ctx.chat?.id);
        const doc = msg.document;
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);

        const message = this.createIncomingMessage(
            chatId,
            {
                text: msg.caption || '',
                document: {
                    url: fileLink.href,
                    mimeType: doc.mime_type || 'application/octet-stream',
                    filename: doc.file_name || 'document'
                }
            },
            {
                userId: String(userId),
                username: ctx.from?.username,
                displayName: ctx.from?.first_name
            }
        );

        this.emit('message', message);
    }

    /**
     * Handle voice messages - transcribe with Groq Whisper
     */
    private async handleVoiceMessage(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        const msg = ctx.message as { voice?: { file_id: string, mime_type?: string, duration?: number } };

        if (!userId || !this.isUserAllowed(userId) || !msg.voice) {
            return;
        }

        const chatId = String(ctx.chat?.id);
        const voice = msg.voice;
        const fileLink = await ctx.telegram.getFileLink(voice.file_id);

        // Try to transcribe with Groq Whisper
        const whisper = getGroqWhisper();
        let transcribedText = '';

        console.log(`🎤 Voice message received, whisper initialized: ${!!whisper}`);

        if (whisper) {
            try {
                // Show transcribing status
                await ctx.telegram.sendChatAction(chatId, 'typing');
                console.log(`🎤 Transcribing from: ${fileLink.href.substring(0, 50)}...`);

                const result = await whisper.transcribeFromUrl(fileLink.href);
                transcribedText = result.text;

                console.log(`🎤 Voice transcribed: "${transcribedText.substring(0, 100)}..."`);
            } catch (error) {
                console.error('Voice transcription failed:', error);
                // Will fall back to sending audio without transcription
            }
        } else {
            console.log('⚠️ Groq Whisper not initialized - add groq.apiKey to config.json');
        }

        // If we got a transcription, send it as text
        if (transcribedText) {
            const message = this.createIncomingMessage(
                chatId,
                { text: transcribedText },
                {
                    userId: String(userId),
                    username: ctx.from?.username,
                    displayName: ctx.from?.first_name,
                    isVoiceMessage: true  // Mark that this was originally a voice message
                }
            );
            this.emit('message', message);
        } else {
            // No transcription available, send audio as-is
            const message = this.createIncomingMessage(
                chatId,
                {
                    audio: {
                        url: fileLink.href,
                        mimeType: voice.mime_type || 'audio/ogg'
                    }
                },
                {
                    userId: String(userId),
                    username: ctx.from?.username,
                    displayName: ctx.from?.first_name
                }
            );
            this.emit('message', message);
        }
    }

    /**
     * Start the Telegram bot
     */
    async start(): Promise<void> {
        if (!this.telegramOptions.enabled) {
            console.log('📵 Telegram channel is disabled');
            return;
        }

        try {
            await this.bot.launch();
            this.isConnected = true;
            console.log('📱 Telegram channel connected');
            this.emit('connected');
        } catch (error) {
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Stop the Telegram bot
     */
    async stop(): Promise<void> {
        this.bot.stop('SIGTERM');
        this.isConnected = false;
        console.log('📴 Telegram channel disconnected');
        this.emit('disconnected');
    }

    /**
     * Send a message to a chat
     */
    /**
     * Helper to resolve local/remote source for Telegram
     */
    private async getSource(media: any): Promise<any> {
        if (!media) return null;
        if (media.url) {
            if (media.url.startsWith('file://')) {
                let filePath = media.url.replace('file://', '');
                // Decode URI components
                try { filePath = decodeURIComponent(filePath); } catch (e) { }
                // Handle Windows paths
                if (process.platform === 'win32' && (filePath.startsWith('\\') || filePath.startsWith('/')) && filePath.includes(':')) {
                    filePath = filePath.substring(1);
                }

                const fs = await import('fs');
                if (fs.existsSync(filePath)) {
                    console.log(`📦 [TelegramChannel] Resolving local file: ${filePath}`);
                    return { source: fs.createReadStream(filePath) };
                } else {
                    console.error(`❌ [TelegramChannel] Local file not found: ${filePath}`);
                }
            }
            return media.url; // Use as-is (http/https)
        }
        if (media.data) {
            return { source: Buffer.from(media.data, 'base64'), filename: media.filename };
        }
        return null;
    }

    /**
     * Send a message to a chat
     */
    async sendMessage(chatId: string, content: MessageContent): Promise<void> {
        console.log(`📤 [TelegramChannel] sendMessage to ${chatId}: media=[${content.image ? 'img' : ''}${content.audio ? 'aud' : ''}${content.video ? 'vid' : ''}${content.document ? 'doc' : ''}] text="${content.text?.substring(0, 30)}..."`);

        try {
            const options: any = { caption: content.text, parse_mode: 'Markdown' };

            // 1. Handle Primary Media with Source Resolution
            if (content.image) {
                const source = await this.getSource(content.image);
                if (source) {
                    await this.bot.telegram.sendPhoto(chatId, source, options);
                    return;
                }
            }

            if (content.video) {
                const source = await this.getSource(content.video);
                if (source) {
                    await this.bot.telegram.sendVideo(chatId, source, options);
                    return;
                }
            }

            if (content.document) {
                const source = await this.getSource(content.document);
                if (source) {
                    await this.bot.telegram.sendDocument(chatId, source, options);
                    return;
                }
            }

            if (content.audio) {
                const source = await this.getSource(content.audio);
                if (source) {
                    console.log(`🎙️ Sending explicit audio to ${chatId}`);
                    // Use sendVoice for audio to get the voice message bubble
                    await this.bot.telegram.sendVoice(chatId, source, options);
                    return;
                }
            }

            // 2. Handle Text-Only (or fallback)
            if (content.text) {
                const text = content.text;

                // 🎙️ EXPERIMENTAL: Auto-detect local file links in text (Legacy Support)
                const voiceMatch = text.match(/file:\/\/(.+?\.mp3)/i);
                if (voiceMatch) {
                    let filePath = voiceMatch[1];
                    if (filePath.endsWith(')')) filePath = filePath.slice(0, -1);
                    try { filePath = decodeURIComponent(filePath); } catch (e) { }
                    if (process.platform === 'win32' && (filePath.startsWith('\\') || filePath.startsWith('/')) && filePath.includes(':')) {
                        filePath = filePath.substring(1);
                    }

                    console.log(`🎙️ Voice Auto-Send: Scanning file '${filePath}'`);

                    const fs = await import('fs');
                    if (fs.existsSync(filePath)) {
                        await this.bot.telegram.sendVoice(chatId, { source: fs.createReadStream(filePath) })
                            .then(() => console.log(`🚀 Auto-voice sent!`))
                            .catch(err => console.error(`❌ Auto-voice failed:`, err));
                    }
                }

                // Actually send the text message
                const maxLength = 4000;
                if (text.length <= maxLength) {
                    await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
                        .catch(() => this.bot.telegram.sendMessage(chatId, text));
                } else {
                    for (let i = 0; i < text.length; i += maxLength) {
                        await this.bot.telegram.sendMessage(chatId, text.slice(i, i + maxLength));
                    }
                }
            }
        } catch (error: any) {
            console.error(`❌ [TelegramChannel] sendMessage Error:`, error);
            // Don't send error to user if it's already a failed media send, as we might send text fallback anyway
        }
    }



    /**
     * Send typing indicator
     */
    async sendTyping(chatId: string): Promise<void> {
        if (this.isConnected) {
            await this.bot.telegram.sendChatAction(chatId, 'typing');
        }
    }

    /**
     * Send a message and return its ID (for later editing)
     */
    async sendMessageWithId(chatId: string, text: string): Promise<number> {
        const msg = await this.bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'Markdown'
        }).catch(() => {
            // Retry without markdown if it fails
            return this.bot.telegram.sendMessage(chatId, text);
        });
        return msg.message_id;
    }

    /**
     * Edit an existing message
     */
    async editMessage(chatId: string, messageId: number, newText: string): Promise<void> {
        try {
            await this.bot.telegram.editMessageText(chatId, messageId, undefined, newText, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            // Retry without markdown if it fails
            try {
                await this.bot.telegram.editMessageText(chatId, messageId, undefined, newText);
            } catch (e) {
                console.error('Failed to edit Telegram message:', e);
            }
        }
    }
}


