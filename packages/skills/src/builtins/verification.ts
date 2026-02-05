
import { ToolDefinition } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';

class VisualVerificationSkill implements Skill {
    id = 'verification';
    name = 'Visual Verification';
    version = '1.0.0';
    description = 'High-level verification tools for built apps (screenshots & video)';
    author = 'Atlas Team';

    tools: ToolDefinition[] = [
        {
            name: 'visual_verify_site',
            description: 'Verify a website by opening it, taking a screenshot, and recording a short video',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to verify' },
                    name: { type: 'string', description: 'Name of the app/site' },
                    recordSeconds: { type: 'number', description: 'How many seconds to record (max 10)' }
                },
                required: ['url', 'name']
            },
            handler: this.handleVisualVerify.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        console.log('Visual Verification Skill loaded');
    }

    async handleVisualVerify(args: unknown, toolContext: any): Promise<any> {
        const params = args as { url: string; name: string; recordSeconds?: number };
        const seconds = Math.min(params.recordSeconds || 5, 10);

        try {
            await toolContext.sendMessage({ text: `🔍 *Verifying ${params.name}...*` });

            // 1. Open Browser
            const openResult = await toolContext.executeTool('browser_open', { url: params.url });
            if (openResult.error) throw new Error(`Browser failed: ${openResult.error}`);

            // 2. Take Screenshot & Send
            await toolContext.executeTool('browser_screenshot_send', {
                caption: `📸 Screenshot of ${params.name} at ${params.url}`,
                fullPage: true
            });

            // 3. Record Video & Send
            await toolContext.executeTool('browser_record_video', {
                durationMs: seconds * 1000,
                caption: `🎥 Walkthrough of ${params.name}`
            });

            await toolContext.sendMessage({ text: `✅ Visual verification complete for *${params.name}*! You should see the screenshot and video above.` });

            return { success: true, message: `Visual verification complete for ${params.name}` };
        } catch (error) {
            return { error: `Verification failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}

export default new VisualVerificationSkill();

