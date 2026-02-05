/**
 * Template Tools
 * Tools for creating projects from templates
 */

import type { ToolDefinition } from '@atlas/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const TEMPLATE_DIR = path.join(os.homedir(), '.atlas', 'templates');

// Ensure template directory exists
async function ensureTemplateDir() {
    await fs.mkdir(TEMPLATE_DIR, { recursive: true });
}

export const listTemplatesTool: ToolDefinition = {
    name: 'list_templates',
    description: 'List available project templates',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    handler: async () => {
        await ensureTemplateDir();
        try {
            // Check built-in or local templates
            const items = await fs.readdir(TEMPLATE_DIR);

            // Should also return built-ins if not present
            const builtIns = [
                { name: 'react-vite-ts', description: 'React + Vite + TypeScript' },
                { name: 'express-ts', description: 'Express API + TypeScript' },
                { name: 'fullstack-ts', description: 'Full Stack (React + Express)' }
            ];

            return {
                available_templates: builtIns,
                local_custom_templates: items
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const createFromTemplateTool: ToolDefinition = {
    name: 'create_from_template',
    description: 'Create a new project from a template',
    parameters: {
        type: 'object',
        properties: {
            templateId: {
                type: 'string',
                description: 'The ID of the template to use (e.g. react-vite-ts)'
            },
            targetDir: {
                type: 'string',
                description: 'The target directory for the new project'
            }
        },
        required: ['templateId', 'targetDir']
    },
    handler: async (args) => {
        const { templateId, targetDir } = args as { templateId: string, targetDir: string };
        const sourcePath = path.join(TEMPLATE_DIR, templateId);
        const destPath = path.resolve(process.cwd(), targetDir);

        try {
            // Check if source exists
            try {
                await fs.access(sourcePath);
            } catch {
                return {
                    error: `Template '${templateId}' not found. Please ask user to install templates via 'atlas new' or checking ~/.atlas/templates.`
                    // Ideally we could auto-install built-ins here too
                };
            }

            // Copy recursively
            await fs.cp(sourcePath, destPath, { recursive: true });

            return {
                result: `Successfully created project in ${destPath} using template ${templateId}`,
                next_steps: [
                    `cd ${targetDir}`,
                    'npm install',
                    'npm run dev'
                ]
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }
};

export const templateTools = [listTemplatesTool, createFromTemplateTool];



