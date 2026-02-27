export type BrowserProfileConfig = {
    cdpPort?: number;
    cdpUrl?: string;
    driver?: "openclaw" | "extension" | "playwright";
    color: string;
};

export type ResolvedBrowserConfig = {
    enabled: boolean;
    evaluateEnabled: boolean;
    controlPort: number;
    cdpProtocol: "http" | "https";
    cdpHost: string;
    cdpIsLoopback: boolean;
    remoteCdpTimeoutMs: number;
    remoteCdpHandshakeTimeoutMs: number;
    color: string;
    executablePath?: string;
    headless: boolean;
    noSandbox: boolean;
    attachOnly: boolean;
    defaultProfile: string;
    profiles: Record<string, BrowserProfileConfig>;
};

export type ResolvedBrowserProfile = {
    name: string;
    cdpPort: number;
    cdpUrl: string;
    cdpHost: string;
    cdpIsLoopback: boolean;
    color: string;
    driver: "openclaw" | "extension" | "playwright";
};
