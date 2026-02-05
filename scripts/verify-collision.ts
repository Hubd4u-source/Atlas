
import * as SkillManagerModule from '../packages/skills/src/manager.js';

// Handle CJS/ESM interop
const SkillManager = (SkillManagerModule as any).SkillManager || (SkillManagerModule as any).default?.SkillManager || SkillManagerModule;

async function main() {
    console.log('🧪 Starting Tool Collision Verification...');
    const manager = new SkillManager();

    // Initialize (loads built-in skills)
    // This should FAIL if we have a collision
    try {
        await manager.initialize({});
        console.log('✅ Initialization successful (Skills loaded)');

        // Manually inject a conflicting skill (since we reverted reminder.ts to 'schedule_task')
        // We will add another skill with 'schedule_task' to force collision INTRA-SKILL-MANAGER
        console.log('💉 Injecting conflicting skill...');
        const conflictingSkill = {
            id: 'conflict-test',
            name: 'Conflict Test Skill',
            version: '1.0.0',
            description: 'Intentionally conflicting skill',
            tools: [{
                name: 'schedule_task', // Conflict with reverted reminder.ts
                description: 'Conflict',
                parameters: { type: 'object', properties: {} },
                handler: async () => 'conflict'
            }]
        };
        // Bypass protected permissions for test
        (manager as any).skills.set('conflict-test', conflictingSkill);

        console.log('🔍 Checking for collisions in getAllTools()...');
        const tools = manager.getAllTools();
        console.log(`❌ FAILURE! Collision detection failed. Managed to get ${tools.length} tools.`);
        process.exit(1);
    } catch (error: any) {
        console.log('\n❌ EXPECTED ERROR CAUGHT:');
        console.log(error.message);

        if (error.message.includes('CRITICAL INTEGRATION ERROR') && error.message.includes('Tool Collision Detected')) {
            console.log('\n✅ VERIFICATION PASSED: Collision detection is working!');
            process.exit(0);
        } else {
            console.log('\n❌ VERIFICATION FAILED: Unexpected error format.');
            process.exit(1);
        }
    }
}

main().catch(console.error);
