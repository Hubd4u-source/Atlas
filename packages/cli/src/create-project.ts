/**
 * Create Project Command
 * Scaffolds new projects from templates
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEMPLATE_DIR = path.join(os.homedir(), '.atlas', 'templates');

interface Template {
    name: string;
    description: string;
    value: string;
}

const BUILTIN_TEMPLATES: Template[] = [
    { name: 'React + Vite + TypeScript', description: 'Modern frontend app', value: 'react-vite-ts' },
    { name: 'Express API + TypeScript', description: 'Backend REST API', value: 'express-ts' },
    { name: 'Full Stack (React + Express)', description: 'Complete web application', value: 'fullstack-ts' }
];

/**
 * Check if directory is empty
 */
async function isDirEmpty(dir: string): Promise<boolean> {
    try {
        const files = await fs.readdir(dir);
        return files.length === 0;
    } catch {
        return true; // Directory doesn't exist
    }
}

/**
 * Copy directory recursively
 */
async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * Run the create project wizard
 */
export async function createProject(targetDir?: string): Promise<void> {
    console.log(chalk.cyan('\n✨ Create New Atlas Project\n'));

    // 1. Get Project Name/Directory
    let projectDir = targetDir;

    if (!projectDir) {
        const { name } = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Project name:',
                default: 'my-app',
                validate: (input) => /^[a-z0-9-_]+$/.test(input) || 'Name must be lowercase, numbers, hyphens or underscores only'
            }
        ]);
        projectDir = name;
    }

    const fullPath = path.resolve(process.cwd(), projectDir!);

    // 2. Check if directory exists
    if (!await isDirEmpty(fullPath)) {
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `Directory ${projectDir} is not empty. Continue anyway?`,
                default: false
            }
        ]);
        if (!overwrite) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
        }
    }

    // 3. Select Template
    const { templateId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'templateId',
            message: 'Select a template:',
            choices: BUILTIN_TEMPLATES
        }
    ]);

    // 4. Scaffold
    const spinner = ora(`Creating project in ${projectDir}...`).start();

    try {
        const templatePath = path.join(TEMPLATE_DIR, templateId);

        // Check if template exists locally
        try {
            await fs.access(templatePath);
        } catch {
            // Template not found in ~/.atlas/templates
            // In a real CLI, we might download it or use bundled assets
            // For now, fail with instruction
            spinner.fail(`Template '${templateId}' not installed locally.`);
            console.log(chalk.yellow(`\nPlease ensure templates are installed in: ${TEMPLATE_DIR}`));
            return;
        }

        await copyDir(templatePath, fullPath);

        // Update package.json name
        const pkgPath = path.join(fullPath, 'package.json');
        try {
            const pkgContent = await fs.readFile(pkgPath, 'utf-8');
            const pkg = JSON.parse(pkgContent);
            pkg.name = projectDir; // Use folder name as package name
            await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
        } catch {
            // No package.json, ignore
        }

        spinner.succeed('Project created successfully!');

        console.log(chalk.green('\nNext steps:'));
        console.log(chalk.cyan(`  cd ${projectDir}`));
        console.log(chalk.cyan('  npm install'));
        console.log(chalk.cyan('  npm run dev\n'));

        // Optional: Install dependencies
        /*
        const { install } = await inquirer.prompt([
            { type: 'confirm', name: 'install', message: 'Install dependencies now?', default: true }
        ]);
        
        if (install) {
            const installSpinner = ora('Installing dependencies...').start();
            await execAsync('npm install', { cwd: fullPath });
            installSpinner.succeed('Dependencies installed!');
        }
        */

    } catch (error) {
        spinner.fail('Failed to create project');
        console.error(error);
    }
}



