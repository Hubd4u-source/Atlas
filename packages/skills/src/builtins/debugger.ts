/**
 * Debugger Skill
 * 
 * Enables programmatic debugging of Node.js scripts using the Inspector API.
 */

import { ToolDefinition } from '@atlas/core';
import { Skill, SkillContext } from '../types.js';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';

interface BreakpointInfo {
    id: string;
    file: string;
    line: number;
}

interface DebugSession {
    process: ChildProcess;
    ws: WebSocket | null;
    scriptPath: string;
    breakpoints: BreakpointInfo[];
    paused: boolean;
    callFrames: any[];
    sessionId: number;
}

class DebuggerSkill implements Skill {
    id = 'debugger';
    name = 'Node.js Debugger';
    version = '1.0.0';
    description = 'Debug Node.js scripts programmatically';
    author = 'Atlas Team';

    private session: DebugSession | null = null;
    private context: SkillContext | null = null;
    private msgId = 1;
    private pendingResponses: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

    tools: ToolDefinition[] = [
        {
            name: 'debug_start',
            description: 'Start debugging a Node.js script. The script will pause at the first line.',
            parameters: {
                type: 'object',
                properties: {
                    scriptPath: { type: 'string', description: 'Absolute path to the script to debug' },
                    args: { type: 'array', items: { type: 'string', description: 'Argument value' }, description: 'Arguments to pass to the script' }
                },
                required: ['scriptPath']
            },
            handler: this.handleDebugStart.bind(this)
        },
        {
            name: 'debug_set_breakpoint',
            description: 'Set a breakpoint at a specific file and line',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Absolute path to the file' },
                    line: { type: 'number', description: 'Line number (1-indexed)' }
                },
                required: ['file', 'line']
            },
            handler: this.handleSetBreakpoint.bind(this)
        },
        {
            name: 'debug_continue',
            description: 'Continue execution until next breakpoint or program end',
            parameters: { type: 'object', properties: {} },
            handler: this.handleContinue.bind(this)
        },
        {
            name: 'debug_step_over',
            description: 'Step to the next line (step over function calls)',
            parameters: { type: 'object', properties: {} },
            handler: this.handleStepOver.bind(this)
        },
        {
            name: 'debug_step_into',
            description: 'Step into the next function call',
            parameters: { type: 'object', properties: {} },
            handler: this.handleStepInto.bind(this)
        },
        {
            name: 'debug_inspect',
            description: 'Inspect a variable or expression value',
            parameters: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: 'Variable name or expression to evaluate' }
                },
                required: ['expression']
            },
            handler: this.handleInspect.bind(this)
        },
        {
            name: 'debug_get_stack',
            description: 'Get the current call stack trace',
            parameters: { type: 'object', properties: {} },
            handler: this.handleGetStack.bind(this)
        },
        {
            name: 'debug_get_locals',
            description: 'Get all local variables in the current scope',
            parameters: { type: 'object', properties: {} },
            handler: this.handleGetLocals.bind(this)
        },
        {
            name: 'debug_stop',
            description: 'Stop the debugging session and terminate the process',
            parameters: { type: 'object', properties: {} },
            handler: this.handleDebugStop.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        this.context = context;
        console.log('🔧 Debugger Skill loaded');
    }

    async onUnload(): Promise<void> {
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        if (this.session) {
            if (this.session.ws) {
                this.session.ws.close();
            }
            if (this.session.process && !this.session.process.killed) {
                this.session.process.kill();
            }
            this.session = null;
        }
        this.pendingResponses.clear();
    }

    private async sendCommand(method: string, params: any = {}): Promise<any> {
        if (!this.session?.ws) {
            throw new Error('No active debug session');
        }

        const id = this.msgId++;
        const message = JSON.stringify({ id, method, params });

        return new Promise((resolve, reject) => {
            this.pendingResponses.set(id, { resolve, reject });
            this.session!.ws!.send(message);

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingResponses.has(id)) {
                    this.pendingResponses.delete(id);
                    reject(new Error(`Command ${method} timed out`));
                }
            }, 10000);
        });
    }

    private async handleDebugStart(args: unknown, toolContext: any): Promise<any> {
        const params = args as { scriptPath: string; args?: string[] };

        try {
            // Cleanup any existing session
            await this.cleanup();

            // Start Node.js with inspector enabled
            const nodeArgs = ['--inspect-brk=0', params.scriptPath, ...(params.args || [])];
            const proc = spawn('node', nodeArgs, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: require('path').dirname(params.scriptPath)
            });

            let wsUrl: string | null = null;
            let stderrBuffer = '';

            // Parse WebSocket URL from stderr
            proc.stderr?.on('data', (data) => {
                const text = data.toString();
                stderrBuffer += text;

                const match = text.match(/ws:\/\/[^\s]+/);
                if (match) {
                    wsUrl = match[0];
                }
            });

            proc.stdout?.on('data', (data) => {
                console.log(`[DEBUG OUT] ${data.toString().trim()}`);
            });

            // Wait for WebSocket URL
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout waiting for debugger')), 5000);
                const interval = setInterval(() => {
                    if (wsUrl) {
                        clearInterval(interval);
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 100);
            });

            // Connect WebSocket
            const ws = new WebSocket(wsUrl!);

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => resolve());
                ws.on('error', (err) => reject(err));
            });

            this.session = {
                process: proc,
                ws,
                scriptPath: params.scriptPath,
                breakpoints: [],
                paused: true,
                callFrames: [],
                sessionId: this.msgId++
            };

            // Handle messages
            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());

                if (msg.id && this.pendingResponses.has(msg.id)) {
                    const { resolve, reject } = this.pendingResponses.get(msg.id)!;
                    this.pendingResponses.delete(msg.id);
                    if (msg.error) {
                        reject(new Error(msg.error.message));
                    } else {
                        resolve(msg.result);
                    }
                }

                // Handle events
                if (msg.method === 'Debugger.paused') {
                    this.session!.paused = true;
                    this.session!.callFrames = msg.params.callFrames || [];
                } else if (msg.method === 'Debugger.resumed') {
                    this.session!.paused = false;
                }
            });

            ws.on('close', () => {
                console.log('🔧 Debug session closed');
            });

            // Enable debugger
            await this.sendCommand('Debugger.enable');
            await this.sendCommand('Runtime.enable');

            return {
                success: true,
                message: `Debugging started: ${params.scriptPath}`,
                paused: true,
                hint: 'Script is paused at first line. Use debug_continue, debug_step_over, or debug_set_breakpoint.'
            };
        } catch (error) {
            await this.cleanup();
            return { error: `Failed to start debugger: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleSetBreakpoint(args: unknown): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };

        const params = args as { file: string; line: number };

        try {
            const result = await this.sendCommand('Debugger.setBreakpointByUrl', {
                lineNumber: params.line - 1, // Chrome DevTools Protocol uses 0-indexed lines
                urlRegex: params.file.replace(/\\/g, '\\\\').replace(/\./g, '\\.')
            });

            const bp: BreakpointInfo = {
                id: result.breakpointId,
                file: params.file,
                line: params.line
            };
            this.session.breakpoints.push(bp);

            return {
                success: true,
                message: `Breakpoint set at ${params.file}:${params.line}`,
                breakpointId: result.breakpointId
            };
        } catch (error) {
            return { error: `Failed to set breakpoint: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleContinue(): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };

        try {
            await this.sendCommand('Debugger.resume');
            return { success: true, message: 'Execution continued' };
        } catch (error) {
            return { error: `Failed to continue: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleStepOver(): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };

        try {
            await this.sendCommand('Debugger.stepOver');
            return { success: true, message: 'Stepped to next line' };
        } catch (error) {
            return { error: `Failed to step: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleStepInto(): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };

        try {
            await this.sendCommand('Debugger.stepInto');
            return { success: true, message: 'Stepped into function' };
        } catch (error) {
            return { error: `Failed to step: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleInspect(args: unknown): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };
        if (this.session.callFrames.length === 0) return { error: 'Not paused at a breakpoint' };

        const params = args as { expression: string };

        try {
            const frame = this.session.callFrames[0];
            const result = await this.sendCommand('Debugger.evaluateOnCallFrame', {
                callFrameId: frame.callFrameId,
                expression: params.expression,
                returnByValue: true
            });

            return {
                expression: params.expression,
                type: result.result?.type,
                value: result.result?.value,
                description: result.result?.description
            };
        } catch (error) {
            return { error: `Failed to inspect: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleGetStack(): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };

        if (this.session.callFrames.length === 0) {
            return { stack: [], message: 'Not paused' };
        }

        const stack = this.session.callFrames.map((frame, idx) => ({
            index: idx,
            functionName: frame.functionName || '(anonymous)',
            file: frame.url,
            line: frame.location?.lineNumber + 1,
            column: frame.location?.columnNumber
        }));

        return { stack };
    }

    private async handleGetLocals(): Promise<any> {
        if (!this.session) return { error: 'No active debug session' };
        if (this.session.callFrames.length === 0) return { error: 'Not paused at a breakpoint' };

        try {
            const frame = this.session.callFrames[0];
            const locals: any[] = [];

            // Get scope chain
            for (const scope of frame.scopeChain) {
                if (scope.type === 'local' || scope.type === 'closure') {
                    const props = await this.sendCommand('Runtime.getProperties', {
                        objectId: scope.object.objectId,
                        ownProperties: true
                    });

                    for (const prop of props.result || []) {
                        if (!prop.name.startsWith('__')) {
                            locals.push({
                                name: prop.name,
                                type: prop.value?.type,
                                value: prop.value?.value ?? prop.value?.description
                            });
                        }
                    }
                }
            }

            return { locals };
        } catch (error) {
            return { error: `Failed to get locals: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    private async handleDebugStop(): Promise<any> {
        await this.cleanup();
        return { success: true, message: 'Debug session stopped' };
    }
}

export default new DebuggerSkill();

