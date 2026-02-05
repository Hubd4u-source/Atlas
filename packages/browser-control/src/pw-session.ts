import {
    chromium,
    type Browser,
    type BrowserContext,
    type ConsoleMessage,
    type Page,
    type Request,
    type Response,
} from "playwright";
import { getHeadersWithAuth } from "./cdp.helpers.js";
import { getChromeWebSocketUrl } from "./chrome.js";

export type BrowserConsoleMessage = {
    type: string;
    text: string;
    timestamp: string;
    location?: { url?: string; lineNumber?: number; columnNumber?: number };
};

export type BrowserPageError = {
    message: string;
    name?: string;
    stack?: string;
    timestamp: string;
};

export type BrowserNetworkRequest = {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    resourceType?: string;
    status?: number;
    ok?: boolean;
    failureText?: string;
};

type TargetInfoResponse = {
    targetInfo?: {
        targetId?: string;
    };
};

type ConnectedBrowser = {
    browser: Browser;
    cdpUrl: string;
};

type PageState = {
    console: BrowserConsoleMessage[];
    errors: BrowserPageError[];
    requests: BrowserNetworkRequest[];
    requestIds: WeakMap<Request, string>;
    nextRequestId: number;
    roleRefs?: Record<string, { role: string; name?: string; nth?: number }>;
    roleRefsMode?: "role" | "aria";
    roleRefsFrameSelector?: string;
};

type RoleRefs = NonNullable<PageState["roleRefs"]>;
type RoleRefsCacheEntry = {
    refs: RoleRefs;
    frameSelector?: string;
    mode?: NonNullable<PageState["roleRefsMode"]>;
};

type ContextState = {
    traceActive: boolean;
};

const pageStates = new WeakMap<Page, PageState>();
const contextStates = new WeakMap<BrowserContext, ContextState>();
const observedContexts = new WeakSet<BrowserContext>();
const observedPages = new WeakSet<Page>();

const roleRefsByTarget = new Map<string, RoleRefsCacheEntry>();
const MAX_ROLE_REFS_CACHE = 50;
const MAX_CONSOLE_MESSAGES = 500;
const MAX_PAGE_ERRORS = 200;
const MAX_NETWORK_REQUESTS = 500;

let cached: ConnectedBrowser | null = null;
let connecting: Promise<ConnectedBrowser> | null = null;

function normalizeCdpUrl(raw: string) {
    return raw.replace(/\/$/, "");
}

function roleRefsKey(cdpUrl: string, targetId: string) {
    return `${normalizeCdpUrl(cdpUrl)}::${targetId}`;
}

export function rememberRoleRefsForTarget(opts: {
    cdpUrl: string;
    targetId: string;
    refs: RoleRefs;
    frameSelector?: string;
    mode?: NonNullable<PageState["roleRefsMode"]>;
}): void {
    const targetId = opts.targetId.trim();
    if (!targetId) return;
    roleRefsByTarget.set(roleRefsKey(opts.cdpUrl, targetId), {
        refs: opts.refs,
        ...(opts.frameSelector ? { frameSelector: opts.frameSelector } : {}),
        ...(opts.mode ? { mode: opts.mode } : {}),
    });
    while (roleRefsByTarget.size > MAX_ROLE_REFS_CACHE) {
        const first = roleRefsByTarget.keys().next();
        if (first.done) break;
        roleRefsByTarget.delete(first.value);
    }
}

export function storeRoleRefsForTarget(opts: {
    page: Page;
    cdpUrl: string;
    targetId?: string;
    refs: RoleRefs;
    frameSelector?: string;
    mode: NonNullable<PageState["roleRefsMode"]>;
}): void {
    const state = ensurePageState(opts.page);
    state.roleRefs = opts.refs;
    state.roleRefsFrameSelector = opts.frameSelector;
    state.roleRefsMode = opts.mode;
    if (!opts.targetId?.trim()) return;
    rememberRoleRefsForTarget({
        cdpUrl: opts.cdpUrl,
        targetId: opts.targetId,
        refs: opts.refs,
        frameSelector: opts.frameSelector,
        mode: opts.mode,
    });
}

export function restoreRoleRefsForTarget(opts: {
    cdpUrl: string;
    targetId?: string;
    page: Page;
}): void {
    const targetId = opts.targetId?.trim() || "";
    if (!targetId) return;
    const cached = roleRefsByTarget.get(roleRefsKey(opts.cdpUrl, targetId));
    if (!cached) return;
    const state = ensurePageState(opts.page);
    if (state.roleRefs) return;
    state.roleRefs = cached.refs;
    state.roleRefsFrameSelector = cached.frameSelector;
    state.roleRefsMode = cached.mode;
}

export function ensurePageState(page: Page): PageState {
    const existing = pageStates.get(page);
    if (existing) return existing;

    const state: PageState = {
        console: [],
        errors: [],
        requests: [],
        requestIds: new WeakMap(),
        nextRequestId: 0,
    };
    pageStates.set(page, state);

    if (!observedPages.has(page)) {
        observedPages.add(page);
        page.on("console", (msg: ConsoleMessage) => {
            const entry: BrowserConsoleMessage = {
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString(),
                location: msg.location(),
            };
            state.console.push(entry);
            if (state.console.length > MAX_CONSOLE_MESSAGES) state.console.shift();
        });
        page.on("pageerror", (err: Error) => {
            state.errors.push({
                message: err?.message ? String(err.message) : String(err),
                name: err?.name ? String(err.name) : undefined,
                stack: err?.stack ? String(err.stack) : undefined,
                timestamp: new Date().toISOString(),
            });
            if (state.errors.length > MAX_PAGE_ERRORS) state.errors.shift();
        });
        page.on("request", (req: Request) => {
            state.nextRequestId += 1;
            const id = `r${state.nextRequestId}`;
            state.requestIds.set(req, id);
            state.requests.push({
                id,
                timestamp: new Date().toISOString(),
                method: req.method(),
                url: req.url(),
                resourceType: req.resourceType() || undefined,
            });
            if (state.requests.length > MAX_NETWORK_REQUESTS) state.requests.shift();
        });
        page.on("response", (resp: Response) => {
            const req = resp.request();
            const id = state.requestIds.get(req);
            if (!id) return;
            let rec: BrowserNetworkRequest | undefined;
            for (let i = state.requests.length - 1; i >= 0; i -= 1) {
                const candidate = state.requests[i];
                if (candidate && candidate.id === id) {
                    rec = candidate;
                    break;
                }
            }
            if (!rec) return;
            rec.status = resp.status();
            rec.ok = resp.ok();
        });
        page.on("requestfailed", (req: Request) => {
            const id = state.requestIds.get(req);
            if (!id) return;
            let rec: BrowserNetworkRequest | undefined;
            for (let i = state.requests.length - 1; i >= 0; i -= 1) {
                const candidate = state.requests[i];
                if (candidate && candidate.id === id) {
                    rec = candidate;
                    break;
                }
            }
            if (!rec) return;
            rec.failureText = req.failure()?.errorText;
            rec.ok = false;
        });
        page.on("close", () => {
            pageStates.delete(page);
            observedPages.delete(page);
        });
    }

    return state;
}

function observeContext(context: BrowserContext) {
    if (observedContexts.has(context)) return;
    observedContexts.add(context);
    ensureContextState(context);

    for (const page of context.pages()) ensurePageState(page);
    context.on("page", (page) => ensurePageState(page));
}

export function ensureContextState(context: BrowserContext): ContextState {
    const existing = contextStates.get(context);
    if (existing) return existing;
    const state: ContextState = { traceActive: false };
    contextStates.set(context, state);
    return state;
}

function observeBrowser(browser: Browser) {
    for (const context of browser.contexts()) observeContext(context);
}

async function connectBrowser(cdpUrl: string): Promise<ConnectedBrowser> {
    const normalized = normalizeCdpUrl(cdpUrl);
    if (cached?.cdpUrl === normalized) return cached;
    if (connecting) return await connecting;

    const connectWithRetry = async (): Promise<ConnectedBrowser> => {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const timeout = 5000 + attempt * 2000;
                const wsUrl = await getChromeWebSocketUrl(normalized, timeout).catch(() => null);
                const endpoint = wsUrl ?? normalized;
                const headers = getHeadersWithAuth(endpoint);
                const browser = await chromium.connectOverCDP(endpoint, { timeout, headers });
                const connected: ConnectedBrowser = { browser, cdpUrl: normalized };
                cached = connected;
                observeBrowser(browser);
                browser.on("disconnected", () => {
                    if (cached?.browser === browser) cached = null;
                });
                return connected;
            } catch (err) {
                lastErr = err;
                const delay = 250 + attempt * 250;
                await new Promise((r) => setTimeout(r, delay));
            }
        }
        throw lastErr || new Error("CDP connect failed");
    };

    connecting = connectWithRetry().finally(() => {
        connecting = null;
    });

    return await connecting;
}

async function getAllPages(browser: Browser): Promise<Page[]> {
    const contexts = browser.contexts();
    const pages = contexts.flatMap((c) => c.pages());
    return pages;
}

async function pageTargetId(page: Page): Promise<string | null> {
    const session = await page.context().newCDPSession(page);
    try {
        const info = (await session.send("Target.getTargetInfo")) as TargetInfoResponse;
        const targetId = String(info?.targetInfo?.targetId ?? "").trim();
        return targetId || null;
    } finally {
        await session.detach().catch(() => { });
    }
}

async function findPageByTargetId(
    browser: Browser,
    targetId: string,
    cdpUrl?: string,
): Promise<Page | null> {
    const pages = await getAllPages(browser);
    for (const page of pages) {
        const tid = await pageTargetId(page).catch(() => null);
        if (tid && tid === targetId) return page;
    }
    return null;
}

export async function getPageForTargetId(opts: {
    cdpUrl: string;
    targetId?: string;
}): Promise<Page> {
    const { browser } = await connectBrowser(opts.cdpUrl);
    const pages = await getAllPages(browser);
    if (!pages.length) throw new Error("No pages available in the connected browser.");
    const first = pages[0]!;
    if (!opts.targetId) return first;
    const found = await findPageByTargetId(browser, opts.targetId, opts.cdpUrl);
    if (!found) {
        if (pages.length === 1) return first;
        throw new Error("tab not found");
    }
    return found;
}

export function refLocator(page: Page, ref: string) {
    const normalized = ref.startsWith("@")
        ? ref.slice(1)
        : ref.startsWith("ref=")
            ? ref.slice(4)
            : ref;

    if (/^e\d+$/.test(normalized)) {
        const state = pageStates.get(page);
        const info = state?.roleRefs?.[normalized];
        if (!info) {
            throw new Error(
                `Unknown ref "${normalized}". Run a new snapshot and use a ref from that snapshot.`,
            );
        }
        const scope = state?.roleRefsFrameSelector
            ? page.frameLocator(state.roleRefsFrameSelector)
            : page;

        const locator = info.name
            ? (scope as any).getByRole(info.role, { name: info.name, exact: true })
            : (scope as any).getByRole(info.role);
        return info.nth !== undefined ? locator.nth(info.nth) : locator;
    }

    return page.locator(`aria-ref=${normalized}`);
}
