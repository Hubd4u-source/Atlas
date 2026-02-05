import fs from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./utils.js";
import type { AppConfig } from "@atlas/core";

export function loadAppConfig(): AppConfig {
    const configPath = path.join(CONFIG_DIR, "config.json");
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, "utf-8");
            return JSON.parse(content);
        }
    } catch (err) {
        console.error(`Failed to load config from ${configPath}:`, err);
    }
    // Return a minimal valid config if not found
    return {
        gateway: { port: 3000, host: "127.0.0.1", auth: { token: "" } },
        agents: { default: "claude" },
        channels: {},
        memory: { backend: "sqlite", maxConversationHistory: 50 },
        skills: { enabled: [] }
    } as any;
}

export function saveAppConfig(config: AppConfig) {
    const configPath = path.join(CONFIG_DIR, "config.json");
    try {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (err) {
        console.error(`Failed to save config to ${configPath}:`, err);
    }
}

