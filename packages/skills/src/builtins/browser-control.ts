import { ToolDefinition, ToolContext } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';
import * as bc from '@atlas/browser-control';

class BrowserControlSkill implements Skill {
    id = 'browser_control';
    name = 'Advanced Browser Control';
    version = '1.0.0';
    description = 'Advanced Chrome control with profile management and extension relay.';
    author = 'Atlas Team';

    private context: SkillContext | null = null;
    private runningInstances: Map<string, bc.RunningChrome> = new Map();

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
                    ref: { type: 'string', description: 'Element reference (e.g. e1)' }
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
                    ref: { type: 'string', description: 'Element reference' },
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
        console.log('🦞 Advanced Browser Control Skill loaded');
    }

    async onUnload(): Promise<void> {
        for (const [profile, instance] of this.runningInstances) {
            await bc.stopOpenClawChrome(instance).catch(() => { });
        }
        this.runningInstances.clear();
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
            driver: 'openclaw'
        });
        return { success: true, profile };
    }

    private async handleLaunch(args: unknown, toolContext: ToolContext): Promise<any> {
        const params = args as { profile: string; headless?: boolean };
        if (this.runningInstances.has(params.profile)) {
            return { success: true, message: `Browser for profile ${params.profile} is already running.` };
        }

        const profileData = await bc.getProfile(params.profile);
        if (!profileData) {
            return { error: `Profile "${params.profile}" not found.` };
        }

        const resolvedConfig: bc.ResolvedBrowserConfig = {
            enabled: true,
            evaluateEnabled: true,
            controlPort: 18800, // This is normally for relay, but we use profile derived ports
            cdpProtocol: "http",
            cdpHost: "127.0.0.1",
            cdpIsLoopback: true,
            remoteCdpTimeoutMs: 5000,
            remoteCdpHandshakeTimeoutMs: 5000,
            color: profileData.color,
            headless: params.headless ?? false,
            noSandbox: true,
            attachOnly: false,
            defaultProfile: params.profile,
            profiles: {
                [params.profile]: {
                    driver: profileData.driver as any,
                    cdpPort: profileData.cdpPort,
                    color: profileData.color
                }
            }
        };

        const resolvedProfile: bc.ResolvedBrowserProfile = {
            name: params.profile,
            driver: profileData.driver as any,
            cdpPort: profileData.cdpPort!,
            cdpUrl: `http://127.0.0.1:${profileData.cdpPort}`,
            cdpHost: "127.0.0.1",
            cdpIsLoopback: true,
            color: profileData.color
        };

        try {
            toolContext.sendMessage?.({ text: `🦞 Launching browser for profile "${params.profile}"...` });
            const instance = await bc.launchOpenClawChrome(resolvedConfig, resolvedProfile);
            this.runningInstances.set(params.profile, instance);
            return { success: true, cdpPort: instance.cdpPort };
        } catch (err) {
            return { error: `Failed to launch browser: ${err instanceof Error ? err.message : String(err)}` };
        }
    }

    private async handleStop(args: unknown): Promise<any> {
        const params = args as { profile: string };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) {
            return { error: `No running browser instance for profile "${params.profile}".` };
        }

        await bc.stopOpenClawChrome(instance);
        this.runningInstances.delete(params.profile);
        return { success: true, message: `Browser for profile "${params.profile}" stopped.` };
    }

    private async handleNavigate(args: unknown): Promise<any> {
        const params = args as { profile: string; url: string };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        const page = await bc.getPageForTargetId({ cdpUrl });
        await page.goto(params.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        return { success: true, url: page.url(), title: await page.title() };
    }

    private async handleClick(args: unknown): Promise<any> {
        const params = args as { profile: string; ref: string };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        await bc.clickViaPlaywright({ cdpUrl, ref: params.ref });
        return { success: true };
    }

    private async handleType(args: unknown): Promise<any> {
        const params = args as { profile: string; ref: string; text: string; submit?: boolean };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        await bc.typeViaPlaywright({
            cdpUrl,
            ref: params.ref,
            text: params.text,
            submit: params.submit
        });
        return { success: true };
    }

    private async handleScreenshot(args: unknown, toolContext: ToolContext): Promise<any> {
        const params = args as { profile: string; fullPage?: boolean };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        const { buffer } = await bc.takeScreenshotViaPlaywright({
            cdpUrl,
            fullPage: params.fullPage
        });

        await toolContext.sendMessage?.({
            text: `Screenshot for profile "${params.profile}"`,
            image: {
                data: buffer.toString('base64'),
                mimeType: 'image/png',
                filename: `screenshot_${params.profile}.png`
            }
        });

        return { success: true };
    }

    private async handleSnapshot(args: unknown): Promise<any> {
        const params = args as { profile: string; interactiveOnly?: boolean };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        const page = await bc.getPageForTargetId({ cdpUrl });
        const aria = await bc.getAriaSnapshot(page);
        const { snapshot, refs } = bc.buildRoleSnapshotFromAriaSnapshot(aria, {
            interactive: params.interactiveOnly ?? true,
            compact: true
        });

        bc.storeRoleRefsForTarget({
            page,
            cdpUrl,
            refs,
            mode: 'role'
        });

        return { snapshot };
    }

    private async handleEvaluate(args: unknown): Promise<any> {
        const params = args as { profile: string; script: string };
        const instance = this.runningInstances.get(params.profile);
        if (!instance) return { error: 'Browser not launched for this profile.' };

        const cdpUrl = `http://127.0.0.1:${instance.cdpPort}`;
        const page = await bc.getPageForTargetId({ cdpUrl });
        const result = await page.evaluate(params.script);
        return { result };
    }
}

export const browserControlSkill = new BrowserControlSkill();
export default browserControlSkill;

