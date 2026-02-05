import {
    allocateCdpPort,
    allocateColor,
    getUsedColors,
    getUsedPorts,
    isValidProfileName,
} from "./profiles.js";
import { loadAppConfig, saveAppConfig } from "./config-manager.js";
import type { BrowserProfileConfig } from "./types.js";
import { DEFAULT_OPENCLAW_BROWSER_COLOR } from "./constants.js";

export type ProfileSummary = {
    name: string;
    cdpPort?: number;
    cdpUrl?: string;
    driver: "openclaw" | "extension";
    color: string;
};

export async function listProfiles(): Promise<ProfileSummary[]> {
    const config = loadAppConfig();
    const profiles = (config.browser?.profiles ?? {}) as Record<string, BrowserProfileConfig>;
    return Object.entries(profiles).map(([name, p]) => ({
        name,
        cdpPort: p.cdpPort,
        cdpUrl: p.cdpUrl,
        driver: p.driver ?? "openclaw",
        color: p.color ?? DEFAULT_OPENCLAW_BROWSER_COLOR,
    }));
}

export async function createProfile(opts: {
    name: string;
    driver?: "openclaw" | "extension";
    color?: string;
    cdpPort?: number;
}): Promise<ProfileSummary> {
    if (!isValidProfileName(opts.name)) {
        throw new Error(
            `Invalid profile name: "${opts.name}". Use lowercase alphanumeric and hyphens.`,
        );
    }

    const config = loadAppConfig();
    if (!config.browser) config.browser = {};
    if (!config.browser.profiles) config.browser.profiles = {};

    if (config.browser.profiles[opts.name]) {
        throw new Error(`Profile "${opts.name}" already exists.`);
    }

    let color = opts.color?.toUpperCase();
    if (!color) {
        color = allocateColor(getUsedColors(config.browser.profiles as any));
    }

    const driver = opts.driver ?? "openclaw";
    let cdpPort = opts.cdpPort;
    let cdpUrl: string | undefined;

    if (driver === "openclaw") {
        if (!cdpPort) {
            const allocated = allocateCdpPort(getUsedPorts(config.browser.profiles as any));
            if (!allocated) throw new Error("No CDP ports available in the default range.");
            cdpPort = allocated;
        }
    }

    const newProfile: any = {
        driver,
        color,
        ...(cdpPort ? { cdpPort } : {}),
    };

    config.browser.profiles[opts.name] = newProfile;
    saveAppConfig(config);

    return {
        name: opts.name,
        driver,
        color,
        cdpPort,
        cdpUrl,
    };
}

export async function deleteProfile(name: string): Promise<void> {
    const config = loadAppConfig();
    if (!config.browser?.profiles || !config.browser.profiles[name]) {
        throw new Error(`Profile "${name}" does not exist.`);
    }

    delete config.browser.profiles[name];
    saveAppConfig(config);
}

export async function getProfile(name: string): Promise<ProfileSummary | null> {
    const config = loadAppConfig();
    const p = config.browser?.profiles?.[name];
    if (!p) return null;

    return {
        name,
        cdpPort: p.cdpPort,
        cdpUrl: p.cdpUrl,
        driver: p.driver ?? "openclaw",
        color: p.color ?? DEFAULT_OPENCLAW_BROWSER_COLOR,
    };
}
