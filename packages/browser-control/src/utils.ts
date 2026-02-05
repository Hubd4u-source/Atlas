import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

export async function ensureDir(dir: string) {
    await fs.promises.mkdir(dir, { recursive: true });
}

export function resolveUserPath(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("~")) {
        const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
        return path.resolve(expanded);
    }
    return path.resolve(trimmed);
}

export async function ensurePortAvailable(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.once("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
                reject(new Error(`Port ${port} is already in use`));
            } else {
                reject(err);
            }
        });
        server.once("listening", () => {
            server.close(() => resolve());
        });
        server.listen(port);
    });
}

export function resolveConfigDir(): string {
    const env = process.env;
    const override = env.ATLAS_STATE_DIR?.trim() || env.OPENCLAW_STATE_DIR?.trim();
    if (override) return resolveUserPath(override);
    return path.join(os.homedir(), ".atlas");
}

export const CONFIG_DIR = resolveConfigDir();

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}



