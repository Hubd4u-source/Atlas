/**
 * Shell Tool - Execute shell commands
 */

import { spawn } from 'child_process';
import type { ToolDefinition } from '@atlas/core';

const MAX_OUTPUT_LENGTH = 50000; // Limit output size
const DEFAULT_TIMEOUT = 30000;  // 30 second default timeout

/**
 * Execute a shell command
 */
export const shellTool: ToolDefinition = {
    name: 'run_command',
    description: 'Execute a shell command and return the output. Use for running scripts, git commands, npm, etc.',
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The command to execute'
            },
            cwd: {
                type: 'string',
                description: 'Working directory for the command (default: current directory)'
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)'
            },
            inBackground: {
                type: 'boolean',
                description: 'Run process in background (detached). Returns success immediately after startup check.'
            },
            allowDangerous: {
                type: 'boolean',
                description: 'Allow potentially dangerous commands (shutdown/kill). Only set if user explicitly asked.'
            }
        },
        required: ['command']
    },
    handler: async (params) => {
        const command = params.command as string;
        const cwd = params.cwd as string | undefined;
        let timeout = (params.timeout as number) || DEFAULT_TIMEOUT;
        const inBackground = params.inBackground as boolean || false;
        const allowDangerous = (params as { allowDangerous?: boolean }).allowDangerous || false;

        const dangerousPatterns: RegExp[] = [
            /\bshutdown\b/i,
            /\brestart\b/i,
            /\breboot\b/i,
            /\bpoweroff\b/i,
            /\bhalt\b/i,
            /\bstop-computer\b/i,
            /\btaskkill\b/i,
            /\bpkill\b/i,
            /\bkill\b/i,
            /\bstop-process\b/i,
            /\bexit\b/i,
            /\bquit\b/i
        ];

        const longRunningPatterns: RegExp[] = [
            /\bnpm\s+run\s+(dev|start|serve)\b/i,
            /\bpnpm\s+(dev|start|serve)\b/i,
            /\byarn\s+(dev|start|serve)\b/i,
            /\bbun\s+(dev|start|serve)\b/i,
            /\bnode\s+.+\b/i,
            /\btsx\s+watch\b/i
        ];

        if (!allowDangerous && dangerousPatterns.some((p) => p.test(command))) {
            return {
                success: false,
                error: 'Dangerous command blocked. Set allowDangerous=true only if the user explicitly requested it.',
                command
            };
        }

        if (!inBackground && longRunningPatterns.some((p) => p.test(command))) {
            return {
                success: false,
                error: 'Long-running command detected. Re-run with inBackground=true to avoid timeouts.',
                command
            };
        }

        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let killed = false;

            // Determine shell based on platform
            const isWindows = process.platform === 'win32';
            const shell = isWindows ? 'powershell.exe' : '/bin/bash';
            const shellArgs = isWindows ? ['-Command', command] : ['-c', command];

            // For background processes, we detach
            const proc = spawn(shell, shellArgs, {
                cwd,
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin for background
                detached: inBackground
            });

            // Handle Output
            proc.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                if (stdout.length > MAX_OUTPUT_LENGTH && !inBackground) { // Only truncate if we are collecting it all
                    stdout = stdout.slice(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)';
                }
            });

            proc.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                if (stderr.length > MAX_OUTPUT_LENGTH && !inBackground) {
                    stderr = stderr.slice(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)';
                }
            });

            // ERROR HANDLING
            proc.on('error', (error) => {
                // If it fails immediately (spawn error)
                resolve({
                    success: false,
                    error: `Spawn error: ${error.message}`,
                    command
                });
            });

            // NORMAL (BLOCKING) MODE
            if (!inBackground) {
                const timer = setTimeout(() => {
                    killed = true;
                    proc.kill('SIGKILL');
                }, timeout);

                proc.on('close', (exitCode) => {
                    clearTimeout(timer);
                    resolve({
                        success: exitCode === 0 && !killed,
                        exitCode,
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        killed,
                        command
                    });
                });
            }

            // BACKGROUND MODE
            else {
                // Wait small buffer (2s) to catch immediate failures (like 'command not found')
                setTimeout(() => {
                    // Check if it already died
                    if (proc.exitCode !== null) {
                        resolve({
                            success: proc.exitCode === 0,
                            exitCode: proc.exitCode,
                            stdout: stdout.trim(),
                            stderr: stderr.trim(),
                            killed: false,
                            command
                        });
                    } else {
                        // Still running! Success.
                        proc.unref(); // Detach from parent
                        resolve({
                            success: true,
                            exitCode: null,
                            stdout: `Background process started. PID: ${proc.pid}\nInitial Output:\n${stdout.substring(0, 1000)}`,
                            stderr: stderr.substring(0, 1000),
                            killed: false,
                            command,
                            pid: proc.pid
                        });
                    }
                }, 2000);
            }
        });
    }
};

/**
 * Get environment variable
 */
export const getEnvTool: ToolDefinition = {
    name: 'get_env',
    description: 'Get the value of an environment variable',
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the environment variable'
            }
        },
        required: ['name']
    },
    handler: async (params) => {
        const name = params.name as string;
        const value = process.env[name];

        return {
            success: true,
            name,
            value: value || null,
            exists: value !== undefined
        };
    }
};

/**
 * Get current working directory
 */
export const getCwdTool: ToolDefinition = {
    name: 'get_cwd',
    description: 'Get the current working directory',
    parameters: {
        type: 'object',
        properties: {}
    },
    handler: async () => {
        return {
            success: true,
            cwd: process.cwd()
        };
    }
};

/**
 * Get all shell tools
 */
export const shellTools: ToolDefinition[] = [
    shellTool,
    getEnvTool,
    getCwdTool
];

