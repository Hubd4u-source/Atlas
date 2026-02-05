
import { ToolDefinition, ToolContext, MessageContent } from '@atlas/core';
import fs from 'fs';
import path from 'path';

export const sendFileConfig: ToolDefinition = {
    name: 'send_file',
    description: 'Send a file (image, audio, document) to the current chat. Use this to send generated voice messages or other assets.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'Absolute path to the file to send.',
            },
            type: {
                type: 'string',
                description: 'Type of file: "image", "audio", "video", or "document".',
                enum: ['image', 'audio', 'video', 'document']
            },
            caption: {
                type: 'string',
                description: 'Optional caption for the file.'
            }
        },
        required: ['filepath', 'type'],
    },
    handler: async (args: any, context: ToolContext) => {
        const { filepath, type, caption } = args;

        if (!fs.existsSync(filepath)) {
            return { success: false, error: `File not found at: ${filepath}` };
        }

        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
            return { success: false, error: `File is empty: ${filepath}` };
        }

        const messageWithFile: MessageContent = {
            text: caption || undefined,
        };

        const url = `file://${filepath}`;
        const mediaContent = { url, mimeType: 'application/octet-stream', filename: path.basename(filepath) }; // Basic default

        switch (type) {
            case 'audio':
                messageWithFile.audio = mediaContent;
                break;
            case 'image':
                messageWithFile.image = mediaContent;
                break;
            case 'video':
                messageWithFile.video = mediaContent;
                break;
            case 'document':
                messageWithFile.document = mediaContent as any;
                break;
        }

        try {
            console.log(`📤 Sending file tool invoked: ${filepath} (${type})`);
            await context.sendMessage(messageWithFile);
            return { success: true, message: "File sent successfully." };
        } catch (e: any) {
            console.error("Failed to send file via tool:", e);
            return { success: false, error: e.message };
        }
    }
};

