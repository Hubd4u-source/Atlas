import { ToolDefinition, ToolContext } from '@atlas/core';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const generateVoiceConfig: ToolDefinition = {
    name: 'generate_voice',
    description: 'Generate a voice audio file from text using a specific TTS API. Returns the path to the saved audio file. IMPORTANT: You MUST include the returned "url" field in your final response for the user to hear it.',
    parameters: {
        type: 'object',
        properties: {
            text: {
                type: 'string',
                description: 'The text to convert to speech.',
            },
            filename: {
                type: 'string',
                description: 'Optional filename for the output file (e.g., "welcome.mp3"). Defaults to a timestamped name.',
            },
            voice: {
                type: 'string',
                description: 'Voice ID to use. Defaults to "voice-107".',
            },
            pitch: {
                type: 'number',
                description: 'Pitch adjustment (default 0).',
            },
            rate: {
                type: 'number',
                description: 'Speech rate adjustment (default 0).',
            }
        },
        required: ['text'],
    },
    handler: async (args: any, context: ToolContext) => {
        const { text, filename, voice = "voice-107", pitch = 0, rate = 0 } = args;

        const outputName = filename || `voice_msg_${Date.now()}.mp3`;
        // Hardcoded absolute path as requested by user to ensure consistency
        const outputDir = 'd:/Projects/AGI/atlas/apps/gateway/temp/voice';

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, outputName);

        try {
            console.log(`🎤 Generating audio for: "${text.substring(0, 50)}..."`);
            const response = await axios.post('https://speechma-unoffcial-api.vercel.app/tts', {
                text,
                voice,
                pitch,
                rate
            }, {
                responseType: 'arraybuffer'
            });

            fs.writeFileSync(outputPath, response.data);
            console.log(`✅ Audio saved to ${outputPath}`);

            return {
                success: true,
                message: "Audio generated successfully",
                file_path: outputPath,
                url: `file://${outputPath}` // Convenient for referencing
            };

        } catch (error: any) {
            console.error("Link generation error:", error.message);
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data?.toString()
                };
            }
            return {
                success: false,
                error: error.message
            };
        }
    },
};

export const voiceTools: ToolDefinition[] = [generateVoiceConfig];


