import { Skill, SkillContext } from '../types.js';

const extensionControlSkill: Skill = {
    id: 'chrome_extension',
    name: 'Chrome Extension Control',
    version: '1.0.0',
    description: 'Control the user\'s real Chrome browser via Atlas Link extension. SEE docs/skills/browser-speed-guide.md FOR HIGH-SPEED AUTOMATION PATTERNS (Amazon, YouTube, etc).',
    tools: [
        {
            name: 'open_in_user_browser',
            description: 'Navigate the USER\'S REAL VISIBLE Chrome browser to a URL. Use this when the user wants to see the page or when you need to access their logged-in sessions (Gmail, GitHub, etc).',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL to navigate to'
                    }
                },
                required: ['url']
            },
            handler: async ({ url }, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'navigate',
                        url
                    });
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension communication channel not available.';
            }
        },
        {
            name: 'user_browser_click',
            description: 'Click an element in the user\'s browser using a CSS selector.',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of the element to click' }
                },
                required: ['selector']
            },
            handler: async ({ selector }, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'click',
                        selector
                    });
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension not connected.';
            }
        },
        {
            name: 'user_browser_type',
            description: 'Type text into an input field in the user\'s browser.',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of the input field' },
                    text: { type: 'string', description: 'Text to type' }
                },
                required: ['selector', 'text']
            },
            handler: async ({ selector, text }, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'type',
                        selector,
                        text
                    });
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension not connected.';
            }
        },
        {
            name: 'user_browser_inspect',
            description: 'Get a list of interactive elements (buttons, links, inputs) from the current page to "see" what can be clicked.',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async (_, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'inspect'
                    });
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension not connected.';
            }
        },
        {
            name: 'user_browser_screenshot',
            description: 'Take a screenshot of the user\'s active browser tab.',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async (_, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'screenshot'
                    });
                    if (result && (result as any).dataUrl) {
                        return `Screenshot captured. (Data URL received, length: ${(result as any).dataUrl.length})`;
                    }
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension not connected.';
            }
        },
        {
            name: 'user_browser_script',
            description: 'Execute custom JavaScript in the user\'s active tab. Use this for complex sequences or when predefined tools are too slow.',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'JavaScript code to execute' }
                },
                required: ['code']
            },
            handler: async ({ code }, context) => {
                const ctx = context as any;
                if (ctx.sendToExtension) {
                    const result = await ctx.sendToExtension({
                        type: 'command',
                        action: 'script',
                        code
                    });
                    return JSON.stringify(result, null, 2);
                }
                return 'Error: Extension not connected.';
            }
        }
    ]
};

export default extensionControlSkill;

