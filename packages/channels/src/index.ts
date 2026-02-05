/**
 * @atlas/channels - Communication adapters
 */

export { BaseChannel, type ChannelOptions, type ChannelEvents } from './base-channel.js';
export { TelegramChannel, type TelegramOptions } from './telegram-channel.js';
export { GroqWhisperService, initGroqWhisper, getGroqWhisper, type GroqWhisperOptions, type TranscriptionResult } from './groq-whisper.js';


