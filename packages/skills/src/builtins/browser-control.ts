import { ToolDefinition, ToolContext } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';
import * as bc from '@atlas/browser-control';

type RunningPlaywrightInstance = {
    context: any;
    page: any;
    userDataDir: string;
    launchedAt: number;
};

class BrowserControlSkill implements Skill {
    id = 'browser_control';
    name = 'Advanced Browser Control';
    version = '1.1.0';
    description = 'Playwright-powered browser control with persistent profiles.';
    author = 'Atlas Team';

    private context: SkillContext | null = null;
    private runningInstances: Map<string, RunningPlaywrightInstance> = new Map();
    private roleRefsByProfile: Map<string, bc.RoleRefMap> = new Map();

    tools: ToolDefinition[] = [
        {
            name: 'browser_profile_list',
            description: 'List available browser profiles',
            parameters: { type: 'object', properties: {} },
            handler: this.handleListProfiles.bind(this)
        },
        {
            name: 'browser_profile_create',
            description: 'Create a new browser profile',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the profile' },
                    color: { type: 'string', description: 'Hex color for the profile (optional)' }
                },
                required: ['name']
            },
            handler: this.handleCreateProfile.bind(this)
        },
        {
            name: 'browser_profile_launch',
            description: 'Launch a browser instance using a profile',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    headless: { type: 'boolean', description: 'Run in headless mode' }
                },
                required: ['profile']
            },
            handler: this.handleLaunch.bind(this)
        },
        {
            name: 'browser_profile_stop',
            description: 'Stop a running browser instance',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' }
                },
                required: ['profile']
            },
            handler: this.handleStop.bind(this)
        },
        {
            name: 'browser_profile_navigate',
            description: 'Navigate to a URL using a started profile browser',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    url: { type: 'string', description: 'URL to navigate to' }
                },
                required: ['profile', 'url']
            },
            handler: this.handleNavigate.bind(this)
        },
        {
            name: 'browser_profile_click',
            description: 'Click an element in a profile browser',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    ref: { type: 'string', description: 'Element reference (e.g. e1) or selector' }
                },
                required: ['profile', 'ref']
            },
            handler: this.handleClick.bind(this)
        },
        {
            name: 'browser_profile_type',
            description: 'Type text into an element in a profile browser',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    ref: { type: 'string', description: 'Element reference or selector' },
                    text: { type: 'string', description: 'Text to type' },
                    submit: { type: 'boolean', description: 'Press Enter after typing' }
                },
                required: ['profile', 'ref', 'text']
            },
            handler: this.handleType.bind(this)
        },
        {
            name: 'browser_profile_screenshot',
            description: 'Take a screenshot in a profile browser',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    fullPage: { type: 'boolean', description: 'Capture full scrollable page' }
                },
                required: ['profile']
            },
            handler: this.handleScreenshot.bind(this)
        },
        {
            name: 'browser_profile_snapshot',
            description: 'Get an ARIA snapshot in a profile browser for element referencing',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    interactiveOnly: { type: 'boolean', description: 'Only show interactive elements (default: true)' }
                },
                required: ['profile']
            },
            handler: this.handleSnapshot.bind(this)
        },
        {
            name: 'browser_profile_evaluate',
            description: 'Execute JavaScript in a profile browser',
            parameters: {
                type: 'object',
                properties: {
                    profile: { type: 'string', description: 'Profile name' },
                    script: { type: 'string', description: 'JavaScript code' }
                },
                required: ['profile', 'script']
            },
            handler: this.handleEvaluate.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        this.context = context;
        console.log('Advanced Browser Control Skill loaded (Playwright runtime)');
    }

    async onUnload(): Promise<void> {
        for (const instance of this.runningInstances.values()) {
            await instance.context.close().catch(() => { });
        }
        this.runningInstances.clear();
        this.roleRefsByProfile.clear();
    }

    private async getPage(profile: string): Promise<any> {
        const instance = this.runningInstances.get(profile);
        if (!instance) throw new Error(`Browser not launched for profile "${profile}".`);

        const existingPages = instance.context.pages();
        if (!instance.page || instance.page.isClosed?.()) {
            instance.page = existingPages[0] ?? await instance.context.newPage();
            return instance.page;
        }

        if (existingPages.length > 0 && !existingPages.includes(instance.page)) {
            instance.page = existingPages[0];
        }

        return instance.page;
    }

    private resolveLocator(profile: string, page: any, rawRef: string): any {
        const trimmed = String(rawRef ?? '').trim();
        if (!trimmed) throw new Error('ref is required');

        const normalized = trimmed.startsWith('@')
            ? trimmed.slice(1)
            : trimmed.startsWith('ref=')
                ? trimmed.slice(4)
                : trimmed;

        const roleRef = bc.parseRoleRef(normalized);
        if (!roleRef) {
            return page.locator(normalized);
        }

        const refs = this.roleRefsByProfile.get(profile);
        const info = refs?.[roleRef];
        if (!info) {
            throw new Error(`Unknown ref "${roleRef}". Run browser_profile_snapshot first.`);
        }

        let locator = info.name
            ? page.getByRole(info.role as any, { name: info.name, exact: true })
            : page.getByRole(info.role as any);

        if (typeof info.nth === 'number') {
            locator = locator.nth(info.nth);
        }

        return locator;
    }

    private async handleListProfiles(): Promise<any> {
        const profiles = await bc.listProfiles();
        return { profiles };
    }

    private async handleCreateProfile(args: unknown): Promise<any> {
        const params = args as { name: string; color?: string };
        const profile = await bc.createProfile({
            name: params.name,
            color: params.color,
            driver: 'playwright'
        });
        return { success: true, profile };
    }

    private async handleLaunch(args: unknown, toolContext: ToolContext): Promise<any> {
        const params = args as { profile: string; headless?: boolean };
        if (this.runningInstances.has(params.profile)) {
            return { success: true, message: `Browser for profile ${params.profile} is already running.`, engine: 'playwright' };
        }

        const profileData = await bc.getProfile(params.profile);
        if (!profileData) {
            return { error: `Profile "${params.profile}" not found.` };
        }

        const { chromium } = await import('playwright');
        const userDataDir = bc.resolveOpenClawUserDataDir(params.profile);

        const commonOptions: any = {
            headless: params.headless ?? false,
            viewport: null,
            args: ['--start-maximized']
        };

        toolContext.sendMessage?.({ text: `Launching Playwright browser for profile "${params.profile}"...` });

        let context: any;
        try {
            context = await chromium.launchPersistentContext(userDataDir, {
                ...commonOptions,
                channel: 'chrome'
            });
        } catch {
            context = await chromium.launchPersistentContext(userDataDir, commonOptions);
        }

        const page = context.pages()[0] ?? await context.newPage();

        this.runningInstances.set(params.profile, {
            context,
            page,
            userDataDir,
            launchedAt: Date.now()
        });

        return {
            success: true,
            engine: 'playwright',
            profile: params.profile,
            headless: params.headless ?? false,
            pageCount: context.pages().length,
            userDataDir
        };
    }

    private async handleStop(args: unknown): Promise<any> {
        const params = args as { profile: string };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) {
            return { error: `No running browser instance for profile "${params.profile}".` };
        }

        await instance.context.close();
        this.runningInstances.delete(params.profile);
        this.roleRefsByProfile.delete(params.profile);

        return { success: true, message: `Browser for profile "${params.profile}" stopped.` };
    }

    private async handleNavigate(args: unknown): Promise<any> {
        const params = args as { profile: string; url: string };
        const page = await this.getPage(params.profile);

        await page.goto(params.url, { timeout: 45000, waitUntil: 'domcontentloaded' });

        return {
            success: true,
            url: page.url(),
            title: await page.title()
        };
    }

    private async handleClick(args: unknown): Promise<any> {
        const params = args as { profile: string; ref: string };
        const page = await this.getPage(params.profile);
        const locator = this.resolveLocator(params.profile, page, params.ref);

        await locator.click({ timeout: 8000 });
        return { success: true };
    }

    private async handleType(args: unknown): Promise<any> {
        const params = args as { profile: string; ref: string; text: string; submit?: boolean };
        const page = await this.getPage(params.profile);
        const locator = this.resolveLocator(params.profile, page, params.ref);

        await locator.fill(params.text, { timeout: 8000 });
        if (params.submit) {
            await locator.press('Enter', { timeout: 8000 });
        }

        return { success: true };
    }

    private async handleScreenshot(args: unknown, toolContext: ToolContext): Promise<any> {
        const params = args as { profile: string; fullPage?: boolean };
        const page = await this.getPage(params.profile);

        const buffer = await page.screenshot({
            fullPage: Boolean(params.fullPage),
            type: 'png'
        });

        await toolContext.sendMessage?.({
            text: `Screenshot for profile "${params.profile}"`,
            image: {
                data: Buffer.from(buffer).toString('base64'),
                mimeType: 'image/png',
                filename: `screenshot_${params.profile}.png`
            }
        });

        return { success: true };
    }

    private async handleSnapshot(args: unknown): Promise<any> {
        const params = args as { profile: string; interactiveOnly?: boolean };
        const page = await this.getPage(params.profile);

        const aria = await bc.getAriaSnapshot(page);
        const { snapshot, refs } = bc.buildRoleSnapshotFromAriaSnapshot(aria, {
            interactive: params.interactiveOnly ?? true,
            compact: true
        });

        this.roleRefsByProfile.set(params.profile, refs);

        return {
            snapshot,
            refsCount: Object.keys(refs).length
        };
    }

    private async handleEvaluate(args: unknown): Promise<any> {
        const params = args as { profile: string; script: string };
        const page = await this.getPage(params.profile);

        const execution = await page.evaluate((script: string) => {
            try {
                const value = (0, eval)(script);
                return { ok: true, value };
            } catch (error: any) {
                return { ok: false, error: error?.message ? String(error.message) : String(error) };
            }
        }, params.script);

        if (!execution?.ok) {
            return { error: execution?.error || 'Script execution failed' };
        }

        return { result: execution.value };
    }
}

export const browserControlSkill = new BrowserControlSkill();
export default browserControlSkill;
