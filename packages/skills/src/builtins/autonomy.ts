
import { Skill, SkillContext } from '../types.js';

class AutonomySkill implements Skill {
    id = 'autonomy';
    name = 'Autonomous Worker';
    version = '1.0.0';
    description = 'Proactive task execution and monitoring';
    author = 'Atlas Team';

    private isWorking = false;
    private lastActivity = Date.now();

    schedules = [
        {
            cron: '*/1 * * * *', // Run every minute
            handler: this.handleHeartbeat.bind(this)
        }
    ];

    async onLoad(context: SkillContext): Promise<void> {
        console.log('🤖 Autonomy Skill loaded: Watching for work...');
    }

    private async handleHeartbeat(context: SkillContext): Promise<void> {
        if (this.isWorking) return;

        try {
            this.isWorking = true;
            console.log('💓 Autonomy Heartbeat: Checking for stalled tasks...');

            // 1. Check if there is an active TODO
            // We can use the 'get_active_todo' tool which is available in the context
            try {
                if (context.executeTool) {
                    const result = await context.executeTool('get_active_todo', {});

                    // If we found an active todo
                    if (result && result.id && result.status === 'in_progress') {
                        console.log(`💓 Found active task: "${result.title}". Waking up agent...`);

                        // 2. Wake up the agent
                        if (context.sendMessage) {
                            // We send a System message to trigger the agent loop
                            // The agent will see this, read the context, and continue working
                            await context.sendMessage({
                                text: `[System Event: Autonomy Heartbeat]\nActive Task: "${result.title}" detected.\nIf you are stuck, check logs or try a different approach.\nIf the task is incomplete, continue working immediately.`,
                            });
                        }
                    } else {
                        // No active tasks: stay silent unless explicitly asked
                        console.log('💤 No active tasks found. Skipping idle notification.');
                    }
                }
            } catch (err) {
                // Ignore tool errors (e.g. if tool not found during init)
                // console.warn('Autonomy check failed:', err);
            }

        } catch (error) {
            console.error('Autonomy error:', error);
        } finally {
            this.isWorking = false;
        }
    }
}

export default new AutonomySkill();

