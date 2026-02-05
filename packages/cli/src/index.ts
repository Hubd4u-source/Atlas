#!/usr/bin/env node
/**
 * Atlas CLI - Command-line interface
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runSetupWizard, loadConfig, configExists, getConfigFile, getConfigDir } from './setup-wizard.js';
import { createProject } from './create-project.js';

const program = new Command();

program
    .name('Atlas')
    .description('Atlas AI Assistant CLI')
    .version('0.1.0');

// Init command - run setup wizard
program
    .command('init')
    .description('Initialize Atlas with interactive setup wizard')
    .action(async () => {
        try {
            await runSetupWizard();
        } catch (error) {
            console.error(chalk.red('Setup failed:'), error);
            process.exit(1);
        }
    });

// New command - create new project
program
    .command('new [name]')
    .description('Create a new project from a template')
    .action(async (name) => {
        try {
            await createProject(name);
        } catch (error) {
            console.error(chalk.red('Failed to create project:'), error);
            process.exit(1);
        }
    });

// Start command - start the gateway
program
    .command('start')
    .description('Start the Atlas gateway service')
    .action(async () => {
        const spinner = ora('Starting Atlas gateway...').start();

        try {
            if (!await configExists()) {
                spinner.fail('Configuration not found');
                console.log(chalk.yellow('\nPlease run "Atlas init" first to set up your configuration.'));
                process.exit(1);
            }

            const config = await loadConfig();
            if (!config) {
                spinner.fail('Failed to load configuration');
                process.exit(1);
            }

            // Dynamic import to avoid loading heavy dependencies until needed
            const { Gateway } = await import('@atlas/core');

            const gateway = new Gateway(config.gateway, config.memory.maxConversationHistory);

            // Handle shutdown
            process.on('SIGINT', async () => {
                console.log(chalk.yellow('\n\nShutting down...'));
                await gateway.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                await gateway.stop();
                process.exit(0);
            });

            await gateway.start();
            spinner.succeed('Atlas gateway started!');

            console.log(chalk.gray(`\nGateway running at: ws://${config.gateway.host}:${config.gateway.port}`));
            console.log(chalk.gray('Press Ctrl+C to stop\n'));

        } catch (error) {
            spinner.fail('Failed to start gateway');
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    });

// Status command - show current status
program
    .command('status')
    .description('Show Atlas status and configuration')
    .action(async () => {
        console.log(chalk.cyan('\n🔍 Atlas Status\n'));

        if (!await configExists()) {
            console.log(chalk.yellow('⚠️  Not configured'));
            console.log(chalk.gray('Run "Atlas init" to set up.'));
            return;
        }

        const config = await loadConfig();
        if (!config) {
            console.log(chalk.red('❌ Failed to load configuration'));
            return;
        }

        console.log(chalk.white('Configuration:'));
        console.log(chalk.gray(`  File: ${getConfigFile()}`));
        console.log();

        console.log(chalk.white('Gateway:'));
        console.log(chalk.gray(`  Host: ${config.gateway.host}`));
        console.log(chalk.gray(`  Port: ${config.gateway.port}`));
        console.log();

        console.log(chalk.white('AI Agents:'));
        console.log(chalk.gray(`  Default: ${config.agents.default}`));
        const claudeConfig = config.agents.claude;
        if (typeof claudeConfig === 'object') {
            console.log(chalk.gray(`  Claude: ${claudeConfig.apiKey ? '✓ Configured' : '✗ Not configured'}`));
        }
        const gptConfig = config.agents.gpt;
        if (typeof gptConfig === 'object') {
            console.log(chalk.gray(`  GPT: ${gptConfig.apiKey ? '✓ Configured' : '✗ Not configured'}`));
        }
        console.log();

        console.log(chalk.white('Channels:'));
        for (const [name, channel] of Object.entries(config.channels)) {
            const ch = channel as { enabled: boolean };
            const status = ch.enabled ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled');
            console.log(chalk.gray(`  ${name}: ${status}`));
        }
        console.log();
    });

// Config command - show or edit config
program
    .command('config')
    .description('Show configuration file location')
    .action(async () => {
        console.log(chalk.cyan('\n📁 Configuration\n'));
        console.log(chalk.white('Config Directory:'));
        console.log(chalk.gray(`  ${getConfigDir()}`));
        console.log();
        console.log(chalk.white('Config File:'));
        console.log(chalk.gray(`  ${getConfigFile()}`));
        console.log();

        if (await configExists()) {
            console.log(chalk.green('✓ Configuration exists'));
            console.log(chalk.gray('\nEdit the config file directly or run "Atlas init" to reconfigure.'));
        } else {
            console.log(chalk.yellow('⚠️  No configuration found'));
            console.log(chalk.gray('\nRun "Atlas init" to create a configuration.'));
        }
    });

program.parse();

