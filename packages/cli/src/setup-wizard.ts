/**
 * Setup Wizard - Interactive configuration for Atlas
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import type { AppConfig } from '@atlas/core';

const CONFIG_DIR = path.join(os.homedir(), '.atlas');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Generate a random token for gateway auth
 */
function generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if config already exists
 */
export async function configExists(): Promise<boolean> {
    try {
        await fs.access(CONFIG_FILE);
        return true;
    } catch {
        return false;
    }
}

/**
 * Load existing config
 */
export async function loadConfig(): Promise<AppConfig | null> {
    try {
        const content = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(content) as AppConfig;
    } catch {
        return null;
    }
}

/**
 * Save config to file
 */
export async function saveConfig(config: AppConfig): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Run the interactive setup wizard
 */
export async function runSetupWizard(): Promise<AppConfig> {
    console.log(chalk.cyan('\n🚀 Welcome to Atlas AI Assistant Setup\n'));
    console.log(chalk.gray('This wizard will help you configure your personal AI assistant.\n'));

    // Check for existing config
    if (await configExists()) {
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: 'Configuration already exists. Do you want to overwrite it?',
                default: false
            }
        ]);

        if (!overwrite) {
            console.log(chalk.yellow('Setup cancelled. Using existing configuration.'));
            const existing = await loadConfig();
            if (existing) return existing;
        }
    }

    // AI Provider Selection
    console.log(chalk.cyan('\n📦 AI Provider Configuration\n'));

    const { aiProvider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'aiProvider',
            message: 'Which AI provider do you want to use as default?',
            choices: [
                { name: 'Anthropic Claude (Recommended)', value: 'claude' },
                { name: 'OpenAI GPT', value: 'gpt' },
                { name: 'Both (Claude as default)', value: 'both' }
            ]
        }
    ]);

    let claudeKey = '';
    let openaiKey = '';

    if (aiProvider === 'claude' || aiProvider === 'both') {
        const { key } = await inquirer.prompt([
            {
                type: 'password',
                name: 'key',
                message: 'Enter your Anthropic API key:',
                mask: '*',
                validate: (input) => input.length > 0 || 'API key is required'
            }
        ]);
        claudeKey = key;
    }

    if (aiProvider === 'gpt' || aiProvider === 'both') {
        const { key } = await inquirer.prompt([
            {
                type: 'password',
                name: 'key',
                message: 'Enter your OpenAI API key:',
                mask: '*',
                validate: (input) => input.length > 0 || 'API key is required'
            }
        ]);
        openaiKey = key;
    }

    // Channel Configuration
    console.log(chalk.cyan('\n💬 Communication Channels\n'));

    const { channels } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'channels',
            message: 'Which channels do you want to enable?',
            choices: [
                { name: 'Telegram', value: 'telegram', checked: true },
                { name: 'Discord', value: 'discord' },
                { name: 'WhatsApp (Coming Soon)', value: 'whatsapp', disabled: true }
            ]
        }
    ]);

    let telegramToken = '';
    let discordToken = '';

    if (channels.includes('telegram')) {
        console.log(chalk.gray('\nTo get a Telegram bot token:'));
        console.log(chalk.gray('1. Open @BotFather on Telegram'));
        console.log(chalk.gray('2. Send /newbot and follow the instructions'));
        console.log(chalk.gray('3. Copy the token provided\n'));

        const { token } = await inquirer.prompt([
            {
                type: 'password',
                name: 'token',
                message: 'Enter your Telegram bot token:',
                mask: '*'
            }
        ]);
        telegramToken = token;
    }

    if (channels.includes('discord')) {
        console.log(chalk.gray('\nTo get a Discord bot token:'));
        console.log(chalk.gray('1. Go to https://discord.com/developers/applications'));
        console.log(chalk.gray('2. Create a new application and add a bot'));
        console.log(chalk.gray('3. Copy the bot token\n'));

        const { token } = await inquirer.prompt([
            {
                type: 'password',
                name: 'token',
                message: 'Enter your Discord bot token:',
                mask: '*'
            }
        ]);
        discordToken = token;
    }

    // Gateway Configuration
    console.log(chalk.cyan('\n⚙️  Gateway Configuration\n'));

    const { port, host } = await inquirer.prompt([
        {
            type: 'number',
            name: 'port',
            message: 'Gateway port:',
            default: 18789
        },
        {
            type: 'input',
            name: 'host',
            message: 'Gateway host:',
            default: 'localhost'
        }
    ]);

    // Build config
    const spinner = ora('Saving configuration...').start();

    const config: AppConfig = {
        gateway: {
            port,
            host,
            auth: {
                token: generateToken()
            }
        },
        agents: {
            default: aiProvider === 'gpt' ? 'gpt' : 'claude',
            claude: {
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
                apiKey: claudeKey || 'YOUR_ANTHROPIC_API_KEY'
            },
            gpt: {
                provider: 'openai',
                model: 'gpt-4-turbo',
                apiKey: openaiKey || 'YOUR_OPENAI_API_KEY'
            }
        },
        channels: {
            telegram: {
                enabled: channels.includes('telegram'),
                token: telegramToken || 'YOUR_TELEGRAM_BOT_TOKEN'
            },
            discord: {
                enabled: channels.includes('discord'),
                token: discordToken || 'YOUR_DISCORD_BOT_TOKEN'
            },
            whatsapp: {
                enabled: false
            }
        },
        memory: {
            backend: 'json',
            maxConversationHistory: 100
        },
        skills: {
            enabled: []
        }
    };

    await saveConfig(config);
    spinner.succeed('Configuration saved!');

    console.log(chalk.green('\n✅ Setup complete!\n'));
    console.log(chalk.gray(`Configuration saved to: ${CONFIG_FILE}`));
    console.log(chalk.gray('\nYou can now start the gateway with:'));
    console.log(chalk.cyan('  npm start\n'));

    return config;
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
    return CONFIG_DIR;
}

/**
 * Get config file path
 */
export function getConfigFile(): string {
    return CONFIG_FILE;
}



