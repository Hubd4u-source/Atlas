import {
    ensurePageState,
    getPageForTargetId,
    refLocator,
    restoreRoleRefsForTarget,
} from "./pw-session.js";
import { normalizeTimeoutMs, requireRef, toAIFriendlyError } from "./pw-tools-core.shared.js";

export async function clickViaPlaywright(opts: {
    cdpUrl: string;
    targetId?: string;
    ref: string;
    doubleClick?: boolean;
    button?: "left" | "right" | "middle";
    modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
    timeoutMs?: number;
}): Promise<void> {
    const page = await getPageForTargetId({
        cdpUrl: opts.cdpUrl,
        targetId: opts.targetId,
    });
    ensurePageState(page);
    restoreRoleRefsForTarget({ cdpUrl: opts.cdpUrl, targetId: opts.targetId, page });
    const ref = requireRef(opts.ref);
    const locator = refLocator(page, ref);
    const timeout = normalizeTimeoutMs(opts.timeoutMs, 8000);
    try {
        if (opts.doubleClick) {
            await locator.dblclick({
                timeout,
                button: opts.button,
                modifiers: opts.modifiers as any,
            });
        } else {
            await locator.click({
                timeout,
                button: opts.button,
                modifiers: opts.modifiers as any,
            });
        }
    } catch (err) {
        throw toAIFriendlyError(err, ref);
    }
}

export async function typeViaPlaywright(opts: {
    cdpUrl: string;
    targetId?: string;
    ref: string;
    text: string;
    submit?: boolean;
    slowly?: boolean;
    timeoutMs?: number;
}): Promise<void> {
    const text = String(opts.text ?? "");
    const page = await getPageForTargetId(opts);
    ensurePageState(page);
    restoreRoleRefsForTarget({ cdpUrl: opts.cdpUrl, targetId: opts.targetId, page });
    const ref = requireRef(opts.ref);
    const locator = refLocator(page, ref);
    const timeout = normalizeTimeoutMs(opts.timeoutMs, 8000);
    try {
        if (opts.slowly) {
            await locator.click({ timeout });
            await locator.type(text, { timeout, delay: 75 });
        } else {
            await locator.fill(text, { timeout });
        }
        if (opts.submit) {
            await locator.press("Enter", { timeout });
        }
    } catch (err) {
        throw toAIFriendlyError(err, ref);
    }
}

export async function hoverViaPlaywright(opts: {
    cdpUrl: string;
    targetId?: string;
    ref: string;
    timeoutMs?: number;
}): Promise<void> {
    const ref = requireRef(opts.ref);
    const page = await getPageForTargetId(opts);
    ensurePageState(page);
    restoreRoleRefsForTarget({ cdpUrl: opts.cdpUrl, targetId: opts.targetId, page });
    try {
        await refLocator(page, ref).hover({
            timeout: normalizeTimeoutMs(opts.timeoutMs, 8000),
        });
    } catch (err) {
        throw toAIFriendlyError(err, ref);
    }
}

export async function takeScreenshotViaPlaywright(opts: {
    cdpUrl: string;
    targetId?: string;
    ref?: string;
    fullPage?: boolean;
    type?: "png" | "jpeg";
}): Promise<{ buffer: Buffer }> {
    const page = await getPageForTargetId(opts);
    ensurePageState(page);
    restoreRoleRefsForTarget({ cdpUrl: opts.cdpUrl, targetId: opts.targetId, page });
    const type = opts.type ?? "png";
    if (opts.ref) {
        const locator = refLocator(page, opts.ref);
        const buffer = await locator.screenshot({ type });
        return { buffer };
    }
    const buffer = await page.screenshot({
        type,
        fullPage: Boolean(opts.fullPage),
    });
    return { buffer };
}
