
import { ToolDefinition } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

class BrowserSkill implements Skill {
    name = 'Browser Automation';
    // Removed duplicate version/description properties to align with interface if needed, or keeping them if optional
    // Checks based on previous file content:
    id = 'browser';
    version = '1.0.0';
    description = 'Web browsing capabilities using Puppeteer';
    author = 'Atlas Team';

    private browser: Browser | null = null;
    private page: Page | null = null;
    private context: SkillContext | null = null;

    private consoleLogs: string[] = [];

    tools: ToolDefinition[] = [
        {
            name: 'browser_open',
            description: 'Open a URL and return the page text content',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to open' }
                },
                required: ['url']
            },
            handler: this.handleBrowserOpen.bind(this)
        },
        {
            name: 'browser_screenshot',
            description: 'Take a screenshot of the current page and return base64',
            parameters: {
                type: 'object',
                properties: {
                    fullPage: { type: 'boolean', description: 'Capture full scrollable page' }
                }
            },
            handler: this.handleBrowserScreenshot.bind(this)
        },
        {
            name: 'browser_screenshot_send',
            description: 'Take a screenshot and send it directly to the user',
            parameters: {
                type: 'object',
                properties: {
                    caption: { type: 'string', description: 'Caption for the image' },
                    fullPage: { type: 'boolean', description: 'Capture full scrollable page' }
                }
            },
            handler: this.handleBrowserScreenshotSend.bind(this)
        },
        {
            name: 'browser_record_video',
            description: 'Record a video of the current page for a specified duration',
            parameters: {
                type: 'object',
                properties: {
                    durationMs: { type: 'number', description: 'Duration to record in milliseconds (max 15000)' },
                    caption: { type: 'string', description: 'Caption for the video' }
                },
                required: ['durationMs']
            },
            handler: this.handleBrowserRecordVideo.bind(this)
        },
        {
            name: 'browser_click',
            description: 'Click an element on the page',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of element to click' }
                },
                required: ['selector']
            },
            handler: this.handleBrowserClick.bind(this)
        },
        {
            name: 'browser_type',
            description: 'Type text into an input field',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of input' },
                    text: { type: 'string', description: 'Text to type' }
                },
                required: ['selector', 'text']
            },
            handler: this.handleBrowserType.bind(this)
        },
        {
            name: 'browser_scroll',
            description: 'Scroll the page',
            parameters: {
                type: 'object',
                properties: {
                    direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
                    amount: { type: 'number', description: 'Pixels to scroll (default 500)' }
                },
                required: ['direction']
            },
            handler: this.handleBrowserScroll.bind(this)
        },
        {
            name: 'browser_execute_script',
            description: 'Execute arbitrary JavaScript on the page',
            parameters: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: 'JavaScript code to execute' }
                },
                required: ['script']
            },
            handler: this.handleBrowserExecuteScript.bind(this)
        },
        {
            name: 'browser_get_console_logs',
            description: 'Get captured console logs from the browser',
            parameters: { type: 'object', properties: {} },
            handler: this.handleBrowserGetConsoleLogs.bind(this)
        },
        {
            name: 'browser_get_html',
            description: 'Get the full HTML source of the page',
            parameters: { type: 'object', properties: {} },
            handler: this.handleBrowserGetHtml.bind(this)
        },
        {
            name: 'browser_close',
            description: 'Close the browser session',
            parameters: { type: 'object', properties: {} },
            handler: this.handleBrowserClose.bind(this)
        },
        // Visual Regression Testing Tools
        {
            name: 'browser_vrt_baseline',
            description: 'Save the current page screenshot as a baseline for visual regression testing',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Unique name for this baseline (e.g., "login-page", "dashboard")' },
                    fullPage: { type: 'boolean', description: 'Capture full scrollable page (default: false)' }
                },
                required: ['name']
            },
            handler: this.handleVrtBaseline.bind(this)
        },
        {
            name: 'browser_vrt_compare',
            description: 'Compare current page screenshot against a saved baseline. Returns difference percentage and generates diff image.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the baseline to compare against' },
                    threshold: { type: 'number', description: 'Pixel mismatch threshold percentage (0-100, default: 5)' },
                    fullPage: { type: 'boolean', description: 'Capture full scrollable page (default: false)' }
                },
                required: ['name']
            },
            handler: this.handleVrtCompare.bind(this)
        },
        {
            name: 'browser_vrt_list',
            description: 'List all saved VRT baselines',
            parameters: { type: 'object', properties: {} },
            handler: this.handleVrtList.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        this.context = context;
        console.log('🌐 Browser Skill loaded (Lazy initialization)');
    }

    async onUnload(): Promise<void> {
        await this.closeBrowser();
    }

    private async getBrowser(): Promise<{ browser: Browser; page: Page }> {
        if (!this.browser) {
            console.log('🌐 Launching Puppeteer...');
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
            });
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1280, height: 800 });
            // Set User Agent to avoid detection
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Attach console listener
            this.page.on('console', msg => {
                const text = msg.text();
                // Filter out boring messages if needed
                this.consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
                if (this.consoleLogs.length > 500) this.consoleLogs.shift();
            });
        }

        if (!this.page) {
            this.page = await this.browser.newPage();
            // Attach console listener (repeated if page was closed and reopened independent of browser)
            this.page.on('console', msg => {
                const text = msg.text();
                this.consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
                if (this.consoleLogs.length > 500) this.consoleLogs.shift();
            });
        }

        return { browser: this.browser, page: this.page };
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.consoleLogs = []; // Clear logs
            console.log('🌐 Browser closed');
        }
    }

    // ... (keep existing handlers) ...

    private async handleBrowserExecuteScript(args: unknown): Promise<any> {
        const params = args as { script: string };
        try {
            if (!this.page) return { error: 'No active page. Use browser_open first.' };

            const result = await this.page.evaluate((script) => {
                // eslint-disable-next-line no-eval
                return eval(script);
            }, params.script);

            return { success: true, result };
        } catch (error) {
            return { error: `Script execution failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserGetConsoleLogs(): Promise<any> {
        return { logs: this.consoleLogs };
    }

    private async handleBrowserGetHtml(): Promise<any> {
        try {
            if (!this.page) return { error: 'No active page. Use browser_open first.' };
            const content = await this.page.content();
            return { html: content.substring(0, 50000) + (content.length > 50000 ? '...[Truncated]' : '') }; // Limit size
        } catch (error) {
            return { error: `Failed to get HTML: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserOpen(args: unknown, toolContext: any): Promise<any> {
        const params = args as { url: string };
        try {
            this.consoleLogs = []; // Clear logs on new navigation
            const { page } = await this.getBrowser();

            toolContext.sendMessage?.(`🌐 Navigating to ${params.url}...`);
            await page.goto(params.url, { waitUntil: 'networkidle0', timeout: 30000 });

            const title = await page.title();

            // Extract text content (simplistic approach)
            const content = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script, style, noscript');
                scripts.forEach((s: Element) => s.remove());
                return document.body.innerText;
            });

            const truncatedContent = content.length > 8000
                ? content.substring(0, 8000) + '\n...[Content Truncated]'
                : content;

            return {
                title,
                url: page.url(),
                content: truncatedContent
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }

    private async handleBrowserScreenshot(params: { fullPage?: boolean }): Promise<any> {
        try {
            if (!this.browser || !this.page) {
                return { error: 'Browser not active. Use browser_open first.' };
            }

            const screenshot = await this.page.screenshot({
                encoding: 'base64',
                fullPage: params.fullPage || false
            });

            return {
                result: 'Screenshot captured',
                image: screenshot // This base64 can be displayed or processed
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }

    private async handleBrowserScreenshotSend(args: unknown, toolContext: any): Promise<any> {
        const params = args as { caption?: string; fullPage?: boolean };
        try {
            if (!this.browser || !this.page) {
                return { error: 'Browser not active. Use browser_open first.' };
            }

            const screenshot = (await this.page.screenshot({
                encoding: 'base64',
                fullPage: params.fullPage || false
            })) as string;

            await toolContext.sendMessage({
                text: params.caption || 'Screenshot of current browser page',
                image: {
                    data: screenshot,
                    mimeType: 'image/png',
                    filename: 'screenshot.png'
                }
            });

            return { success: true, message: 'Screenshot sent to user' };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }

    private async handleBrowserRecordVideo(args: unknown, toolContext: any): Promise<any> {
        const params = args as { durationMs: number; caption?: string };
        const duration = Math.min(params.durationMs, 15000); // 15s max

        try {
            const { page } = await this.getBrowser();
            const tempFile = path.join(os.tmpdir(), `recording_${Date.now()}.mp4`);

            const recorder = new PuppeteerScreenRecorder(page, {
                followNewTab: true,
                fps: 25,
                ffmpeg_Path: undefined, // Let it try to find it or fail
                videoFrame: {
                    width: 1280,
                    height: 800,
                },
                aspectRatio: '16:9',
            });

            toolContext.sendMessage?.(`🎥 Recording browser for ${duration / 1000}s...`);
            await recorder.start(tempFile);

            // Wait for duration
            await new Promise(r => setTimeout(r, duration));

            await recorder.stop();

            // Read video as base64
            const videoData = await fs.readFile(tempFile);
            const base64Video = videoData.toString('base64');

            await toolContext.sendMessage({
                text: params.caption || `Video recording (${duration / 1000}s)`,
                video: {
                    data: base64Video,
                    mimeType: 'video/mp4',
                    filename: 'recording.mp4'
                }
            });

            // Cleanup
            await fs.unlink(tempFile).catch(() => { });

            return { success: true, message: 'Video recorded and sent' };
        } catch (error) {
            return { error: `Failed to record video: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserClick(args: unknown): Promise<any> {
        const params = args as { selector: string };
        try {
            if (!this.page) return { error: 'No active page. Use browser_open first.' };

            await this.page.waitForSelector(params.selector, { timeout: 5000 });
            await this.page.click(params.selector);

            // Wait a bit for navigation or animation
            await new Promise(r => setTimeout(r, 1000));

            return { success: true, message: `Clicked ${params.selector}` };
        } catch (error) {
            return { error: `Click failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserType(args: unknown): Promise<any> {
        const params = args as { selector: string; text: string };
        try {
            if (!this.page) return { error: 'No active page. Use browser_open first.' };

            await this.page.waitForSelector(params.selector, { timeout: 5000 });
            await this.page.type(params.selector, params.text, { delay: 50 }); // Realistic typing

            return { success: true, message: `Typed into ${params.selector}` };
        } catch (error) {
            return { error: `Type failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserScroll(args: unknown): Promise<any> {
        const params = args as { direction: 'up' | 'down'; amount?: number };
        const amount = params.amount || 500;
        try {
            if (!this.page) return { error: 'No active page. Use browser_open first.' };

            await this.page.evaluate((y) => {
                window.scrollBy(0, y);
            }, params.direction === 'down' ? amount : -amount);

            return { success: true, message: `Scrolled ${params.direction} by ${amount}px` };
        } catch (error) {
            return { error: `Scroll failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleBrowserClose(): Promise<any> {
        await this.closeBrowser();
        return { success: true, message: 'Browser session ended' };
    }

    // ========================================================================
    // Visual Regression Testing (VRT) Methods
    // ========================================================================

    private getVrtDir(): string {
        return path.join(os.homedir(), '.atlas', 'vrt', 'baselines');
    }

    private async handleVrtBaseline(args: unknown): Promise<any> {
        const params = args as { name: string; fullPage?: boolean };

        try {
            if (!this.browser || !this.page) {
                return { error: 'Browser not active. Use browser_open first.' };
            }

            const vrtDir = this.getVrtDir();
            await fs.mkdir(vrtDir, { recursive: true });

            const baselinePath = path.join(vrtDir, `${params.name}.png`);

            await this.page.screenshot({
                path: baselinePath,
                fullPage: params.fullPage || false
            });

            return {
                success: true,
                message: `Baseline saved: ${params.name}`,
                path: baselinePath
            };
        } catch (error) {
            return { error: `Failed to save baseline: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleVrtCompare(args: unknown, toolContext: any): Promise<any> {
        const params = args as { name: string; threshold?: number; fullPage?: boolean };

        try {
            if (!this.browser || !this.page) {
                return { error: 'Browser not active. Use browser_open first.' };
            }

            const vrtDir = this.getVrtDir();
            const baselinePath = path.join(vrtDir, `${params.name}.png`);

            // Check if baseline exists
            try {
                await fs.access(baselinePath);
            } catch {
                return { error: `Baseline not found: ${params.name}. Use browser_vrt_baseline first.` };
            }

            // Take current screenshot
            const currentScreenshot = await this.page.screenshot({
                encoding: 'binary',
                fullPage: params.fullPage || false
            }) as Buffer;

            // Read baseline
            const baselineBuffer = await fs.readFile(baselinePath);

            // Simple pixel comparison (using PNG raw comparison)
            // For production, you would use pixelmatch library
            const baselineSize = baselineBuffer.length;
            const currentSize = currentScreenshot.length;

            // Calculate rough difference based on binary comparison
            let diffCount = 0;
            const minLen = Math.min(baselineSize, currentSize);
            for (let i = 0; i < minLen; i++) {
                if (baselineBuffer[i] !== currentScreenshot[i]) {
                    diffCount++;
                }
            }
            diffCount += Math.abs(baselineSize - currentSize);

            const totalPixels = Math.max(baselineSize, currentSize);
            const diffPercent = (diffCount / totalPixels) * 100;
            const threshold = params.threshold ?? 5;
            const passed = diffPercent <= threshold;

            // Save diff screenshot if there are differences
            if (!passed) {
                const diffPath = path.join(vrtDir, `${params.name}_diff.png`);
                await fs.writeFile(diffPath, currentScreenshot);

                // Send diff image to user
                const base64Diff = currentScreenshot.toString('base64');
                await toolContext.sendMessage?.({
                    text: `🔴 Visual regression detected in "${params.name}"\nDifference: ${diffPercent.toFixed(2)}% (threshold: ${threshold}%)`,
                    image: {
                        data: base64Diff,
                        mimeType: 'image/png',
                        filename: `${params.name}_current.png`
                    }
                });
            }

            return {
                success: true,
                passed,
                difference: `${diffPercent.toFixed(2)}%`,
                threshold: `${threshold}%`,
                message: passed
                    ? `✅ Visual regression test passed for "${params.name}"`
                    : `🔴 Visual regression detected in "${params.name}": ${diffPercent.toFixed(2)}% difference`
            };
        } catch (error) {
            return { error: `VRT comparison failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleVrtList(): Promise<any> {
        try {
            const vrtDir = this.getVrtDir();

            try {
                await fs.access(vrtDir);
            } catch {
                return { baselines: [], message: 'No baselines saved yet.' };
            }

            const files = await fs.readdir(vrtDir);
            const baselines = files
                .filter(f => f.endsWith('.png') && !f.includes('_diff'))
                .map(f => f.replace('.png', ''));

            return {
                baselines,
                count: baselines.length,
                directory: vrtDir
            };
        } catch (error) {
            return { error: `Failed to list baselines: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}

export default new BrowserSkill();



