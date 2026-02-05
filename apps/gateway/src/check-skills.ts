
import { SkillManager } from '@atlas/skills';

async function check() {
    console.log('🕵️ Checking Loaded Skills...');
    const manager = new SkillManager();
    await manager.initialize({} as any);

    const skills = manager.getSkills();
    console.log(`📦 Loaded ${skills.length} skills:`);
    skills.forEach(s => console.log(` - ${s.name} (${s.id})`));

    const tools = manager.getAllTools();
    console.log(`🛠️ Total Tools: ${tools.length}`);
    tools.forEach(t => console.log(` - ${t.name}`));

    const browser = manager.getSkill('browser');
    if (browser) {
        console.log('✅ Browser Skill FOUND!');
    } else {
        console.log('❌ Browser Skill NOT found.');
    }
}

check().catch(console.error);

