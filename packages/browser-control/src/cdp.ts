import { appendCdpPath, fetchJson, isLoopbackHost, withCdpSocket } from "./cdp.helpers.js";

export { appendCdpPath, fetchJson, fetchOk, getHeadersWithAuth } from "./cdp.helpers.js";

export function normalizeCdpWsUrl(wsUrl: string, cdpUrl: string): string {
    const ws = new URL(wsUrl);
    const cdp = new URL(cdpUrl);
    if (isLoopbackHost(ws.hostname) && !isLoopbackHost(cdp.hostname)) {
        ws.hostname = cdp.hostname;
        const cdpPort = cdp.port || (cdp.protocol === "https:" ? "443" : "80");
        if (cdpPort) ws.port = cdpPort;
        ws.protocol = cdp.protocol === "https:" ? "wss:" : "ws:";
    }
    if (cdp.protocol === "https:" && ws.protocol === "ws:") {
        ws.protocol = "wss:";
    }
    if (!ws.username && !ws.password && (cdp.username || cdp.password)) {
        ws.username = cdp.username;
        ws.password = cdp.password;
    }
    for (const [key, value] of cdp.searchParams.entries()) {
        if (!ws.searchParams.has(key)) ws.searchParams.append(key, value);
    }
    return ws.toString();
}

export async function captureScreenshot(opts: {
    wsUrl: string;
    fullPage?: boolean;
    format?: "png" | "jpeg";
    quality?: number; // jpeg only (0..100)
}): Promise<Buffer> {
    return await withCdpSocket(opts.wsUrl, async (send) => {
        await send("Page.enable");

        let clip: { x: number; y: number; width: number; height: number; scale: number } | undefined;
        if (opts.fullPage) {
            const metrics = (await send("Page.getLayoutMetrics")) as {
                cssContentSize?: { width?: number; height?: number };
                contentSize?: { width?: number; height?: number };
            };
            const size = metrics?.cssContentSize ?? metrics?.contentSize;
            const width = Number(size?.width ?? 0);
            const height = Number(size?.height ?? 0);
            if (width > 0 && height > 0) {
                clip = { x: 0, y: 0, width, height, scale: 1 };
            }
        }

        const format = opts.format ?? "png";
        const quality =
            format === "jpeg" ? Math.max(0, Math.min(100, Math.round(opts.quality ?? 85))) : undefined;

        const result = (await send("Page.captureScreenshot", {
            format,
            ...(quality !== undefined ? { quality } : {}),
            fromSurface: true,
            captureBeyondViewport: true,
            ...(clip ? { clip } : {}),
        })) as { data?: string };

        const base64 = result?.data;
        if (!base64) throw new Error("Screenshot failed: missing data");
        return Buffer.from(base64, "base64");
    });
}

export type CdpRemoteObject = {
    type: string;
    subtype?: string;
    value?: unknown;
    description?: string;
    unserializableValue?: string;
    preview?: unknown;
};

export type CdpExceptionDetails = {
    text?: string;
    lineNumber?: number;
    columnNumber?: number;
    exception?: CdpRemoteObject;
    stackTrace?: unknown;
};

export async function evaluateJavaScript(opts: {
    wsUrl: string;
    expression: string;
    awaitPromise?: boolean;
    returnByValue?: boolean;
}): Promise<{
    result: CdpRemoteObject;
    exceptionDetails?: CdpExceptionDetails;
}> {
    return await withCdpSocket(opts.wsUrl, async (send) => {
        await send("Runtime.enable").catch(() => { });
        const evaluated = (await send("Runtime.evaluate", {
            expression: opts.expression,
            awaitPromise: Boolean(opts.awaitPromise),
            returnByValue: opts.returnByValue ?? true,
            userGesture: true,
            includeCommandLineAPI: true,
        })) as {
            result?: CdpRemoteObject;
            exceptionDetails?: CdpExceptionDetails;
        };

        const result = evaluated?.result;
        if (!result) throw new Error("CDP Runtime.evaluate returned no result");
        return { result, exceptionDetails: evaluated.exceptionDetails };
    });
}

export type AriaSnapshotNode = {
    ref: string;
    role: string;
    name: string;
    value?: string;
    description?: string;
    backendDOMNodeId?: number;
    depth: number;
};

export type DomSnapshotNode = {
    ref: string;
    parentRef: string | null;
    depth: number;
    tag: string;
    id?: string;
    className?: string;
    role?: string;
    name?: string;
    text?: string;
    href?: string;
    type?: string;
    value?: string;
};

export type QueryMatch = {
    index: number;
    tag: string;
    id?: string;
    className?: string;
    text?: string;
    value?: string;
    href?: string;
    outerHTML?: string;
};
export async function getAriaSnapshot(page: any): Promise<string> {
    if (typeof page.ariaSnapshot === 'function') {
        return await page.ariaSnapshot();
    }
    // Fallback if not available (though it should be in recent playwright)
    throw new Error("Page.ariaSnapshot() not available in this Playwright version.");
}
