/**
 * Skill Manager
 * Handles loading and lifecycle of skills
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'eventemitter3';
import type { Skill, SkillContext } from './types.js';
import type { ToolDefinition } from '@atlas/core';
import browserSkill from './builtins/browser.js';
import voiceSkill from './builtins/voice.js';
import canvasSkill from './builtins/canvas.js';
import reminderSkill from './builtins/reminder.js';
import verificationSkill from './builtins/verification.js';
import autonomySkill from './builtins/autonomy.js';
import extensionControlSkill from './builtins/extension_control.js';
import debuggerSkill from './builtins/debugger.js';
import browserControlSkill from './builtins/browser-control.js';

export class SkillManager extends EventEmitter {
    private skills: Map<string, Skill> = new Map();
    private context: SkillContext = {};

    constructor() {
        super();
    }

    /**
     * Initialize the skill manager
     */
    async initialize(context: SkillContext): Promise<void> {
        this.context = context;
        await this.loadBuiltInSkills();
        await this.loadUserSkills();
    }

    /**
     * Load skills from a directory
     */
    async loadSkillsFromDir(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory() || entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
                    // Skip definition files
                    if (entry.name.endsWith('.d.ts')) continue;

                    const skillPath = path.join(dir, entry.name);
                    await this.loadSkill(skillPath);
                }
            }
        } catch (error: any) {
            // Directory might not exist, which is fine
            if (error.code === 'ENOENT') {
                console.log(`ℹ️ No skills found in ${dir} (directory does not exist)`);
                return;
            }
            console.error(`Failed to load skills from ${dir}:`, error);
        }
    }

    /**
     * Load a single skill
     */
    async loadSkill(skillPath: string): Promise<void> {
        try {
            // Dynamic import of the skill module
            // We use pathToFileURL for Windows compatibility with ESM imports
            const importPath = process.platform === 'win32'
                ? `file://${skillPath}`
                : skillPath;

            const module = await import(importPath);
            const skill = module.default as Skill;

            if (!skill || !skill.id || !skill.name) {
                console.warn(`Invalid skill at ${skillPath}: Missing id or name`);
                return;
            }

            if (this.skills.has(skill.id)) {
                console.warn(`Skill ${skill.id} already loaded, skipping duplicate from ${skillPath}`);
                return;
            }

            // Execute onLoad if present
            if (skill.onLoad) {
                await skill.onLoad(this.context);
            }

            this.skills.set(skill.id, skill);
            console.log(`✓ Loaded skill: ${skill.name} (${skill.id})`);
            this.emit('skillLoaded', skill);

        } catch (error) {
            console.error(`Failed to load skill from ${skillPath}:`, error);
        }
    }

    /**
     * Load built-in skills (if any)
     */
    private async loadBuiltInSkills(): Promise<void> {
        try {
            const builtIns = [browserSkill, voiceSkill, canvasSkill, reminderSkill, verificationSkill, autonomySkill, extensionControlSkill, debuggerSkill, browserControlSkill];

            for (const skill of builtIns) {
                if (skill) {
                    if (skill.onLoad) {
                        await skill.onLoad(this.context);
                    }
                    this.skills.set((skill as Skill).id, skill as Skill);
                    console.log(`✓ Loaded built-in skill: ${(skill as Skill).name}`);
                }
            }
        } catch (error) {
            console.error('Failed to load built-in skills:', error);
        }
    }

    /**
     * Load user skills from ~/.atlas/skills
     */
    private async loadUserSkills(): Promise<void> {
        const userSkillsDir = path.join(os.homedir(), '.atlas', 'skills');
        await this.loadSkillsFromDir(userSkillsDir);
    }

    /**
     * Get all tools provided by loaded skills
     */
    getAllTools(): ToolDefinition[] {
        const tools: ToolDefinition[] = [];
        const seenTools = new Map<string, string>(); // toolName -> skillId

        for (const skill of this.skills.values()) {
            if (skill.tools) {
                for (const tool of skill.tools) {
                    if (seenTools.has(tool.name)) {
                        const existingSkill = seenTools.get(tool.name);
                        throw new Error(
                            `CRITICAL INTEGRATION ERROR: Tool Collision Detected.\n` +
                            `Tool '${tool.name}' is defined in both:\n` +
                            `1. ${existingSkill} (Loaded first)\n` +
                            `2. ${skill.id} (Loading now)\n` +
                            `Resolution: Rename one of the tools to be unique.`
                        );
                    }
                    seenTools.set(tool.name, skill.id);
                    tools.push(tool);
                }
            }
        }
        return tools;
    }

    /**
     * Get all schedules provided by loaded skills
     */
    getAllSchedules(): { skillId: string; cron: string; handler: (context: SkillContext) => Promise<void> }[] {
        const schedules: { skillId: string; cron: string; handler: (context: SkillContext) => Promise<void> }[] = [];
        for (const skill of this.skills.values()) {
            if (skill.schedules) {
                for (const schedule of skill.schedules) {
                    schedules.push({
                        skillId: skill.id,
                        cron: schedule.cron,
                        handler: schedule.handler
                    });
                }
            }
        }
        return schedules;
    }

    /**
     * Get a specific skill
     */
    getSkill(id: string): Skill | undefined {
        return this.skills.get(id);
    }

    /**
     * Get all loaded skills
     */
    getSkills(): Skill[] {
        return Array.from(this.skills.values());
    }
}



