
import { ToolDefinition } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';
import * as puppeteer from 'puppeteer';

class CanvasSkill implements Skill {
    id = 'canvas';
    name = 'Canvas UI';
    version = '1.0.0';
    description = 'Render HTML and Diagrams to images';
    author = 'Atlas Team';

    private context: SkillContext | null = null;
    private browser: puppeteer.Browser | null = null;

    tools: ToolDefinition[] = [
        {
            name: 'canvas_render_html',
            description: 'Render an HTML snippet to an image',
            parameters: {
                type: 'object',
                properties: {
                    html: { type: 'string', description: 'HTML content to render' },
                    width: { type: 'number', description: 'Viewport width (default 800)' },
                    height: { type: 'number', description: 'Viewport height (default 600)' }
                },
                required: ['html']
            },
            handler: this.handleRenderHtml.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        this.context = context;
        console.log('🎨 Canvas Skill loaded');
    }

    async onUnload(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private async handleRenderHtml(args: unknown): Promise<any> {
        const params = args as { html: string; width?: number; height?: number };

        try {
            if (!this.browser) {
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }

            const page = await this.browser.newPage();
            await page.setViewport({
                width: params.width || 800,
                height: params.height || 600
            });

            await page.setContent(params.html, { waitUntil: 'networkidle0' });

            const screenshot = await page.screenshot({ encoding: 'base64' });
            await page.close();

            return {
                success: true,
                image: screenshot, // Base64 image
                format: 'png'
            };

        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
}

export default new CanvasSkill();

