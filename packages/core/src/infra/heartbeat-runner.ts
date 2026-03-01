import { emitHeartbeatEvent, resolveIndicatorType } from './heartbeat-events.js';

export type HeartbeatRunResult = {
    status: "skipped" | "ran";
    reason?: string;
    durationMs?: number;
};

export type HeartbeatWakeHandler = (opts: {
    reason?: string;
    agentId?: string;
    sessionKey?: string;
}) => void;

let wakeHandler: HeartbeatWakeHandler | undefined;

export function setHeartbeatWakeHandler(handler: HeartbeatWakeHandler) {
    wakeHandler = handler;
}

export function requestHeartbeatNow(opts: {
    reason?: string;
    agentId?: string;
    sessionKey?: string;
} = {}) {
    if (wakeHandler) {
        wakeHandler(opts);
    }
}

// In a full port this would process system events, check gateway queues,
// evaluate HEARTBEAT.md gating, and ask the active agent for a Turn.
// For Atlas, we abstract the Agent Turn to a provided callback so the Gateway
// can maintain its own decoupled Agent lifecycle.
export async function runHeartbeatOnce(opts: {
    agentId?: string;
    sessionKey?: string;
    reason?: string;
    dispatchAgentTurn: () => Promise<boolean>; // Returns true if it produced output
}): Promise<HeartbeatRunResult> {
    const startedAt = Date.now();
    try {
        const producedOutput = await opts.dispatchAgentTurn();

        if (!producedOutput) {
            emitHeartbeatEvent({
                status: "ok-empty",
                reason: opts.reason,
                durationMs: Date.now() - startedAt,
                silent: true,
                indicatorType: resolveIndicatorType("ok-empty"),
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        emitHeartbeatEvent({
            status: "sent",
            reason: opts.reason,
            durationMs: Date.now() - startedAt,
            indicatorType: resolveIndicatorType("sent"),
        });

        return { status: "ran", durationMs: Date.now() - startedAt };
    } catch (err) {
        emitHeartbeatEvent({
            status: "failed",
            reason: String(err),
            durationMs: Date.now() - startedAt,
            indicatorType: resolveIndicatorType("failed"),
        });
        return { status: "skipped", reason: "error" };
    }
}
