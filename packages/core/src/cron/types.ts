export type CronSchedule =
    | { kind: "at"; at: string }
    | { kind: "every"; everyMs: number; anchorMs?: number }
    | {
        kind: "cron";
        expr: string;
        tz?: string;
        staggerMs?: number;
    };

export type CronSessionTarget = "main" | "isolated";
export type CronWakeMode = "next-heartbeat" | "now";
export type CronDeliveryMode = "none" | "announce" | "webhook";

export type CronDelivery = {
    mode: CronDeliveryMode;
    to?: string;
    bestEffort?: boolean;
};

export type CronRunStatus = "ok" | "error" | "skipped";
export type CronDeliveryStatus = "delivered" | "not-delivered" | "unknown" | "not-requested";

export type CronPayload =
    | { kind: "systemEvent"; text: string }
    | {
        kind: "agentTurn";
        message: string;
        model?: string;
        thinking?: string;
        timeoutSeconds?: number;
        deliver?: boolean;
    };

export type CronJobState = {
    nextRunAtMs?: number;
    runningAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: CronRunStatus;
    lastError?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
    scheduleErrorCount?: number;
    lastDeliveryStatus?: CronDeliveryStatus;
    lastDeliveryError?: string;
    lastDelivered?: boolean;
};

export type CronJob = {
    id: string;
    agentId?: string;
    sessionKey?: string;
    name: string;
    description?: string;
    enabled: boolean;
    deleteAfterRun?: boolean;
    createdAtMs: number;
    updatedAtMs: number;
    schedule: CronSchedule;
    sessionTarget: CronSessionTarget;
    wakeMode: CronWakeMode;
    payload: CronPayload;
    delivery?: CronDelivery;
    state: CronJobState;
};

export type CronStoreFile = {
    version: 1;
    jobs: CronJob[];
};

export type CronJobCreate = Omit<CronJob, "id" | "createdAtMs" | "updatedAtMs" | "state"> & {
    id?: string;
    state?: Partial<CronJobState>;
};

export type CronPayloadPatch =
    | { kind: "systemEvent"; text?: string }
    | {
        kind: "agentTurn";
        message?: string;
        model?: string;
        thinking?: string;
        timeoutSeconds?: number;
        deliver?: boolean;
    };

export type CronJobPatch = Partial<Omit<CronJob, "id" | "createdAtMs" | "state" | "payload">> & {
    payload?: CronPayloadPatch;
    state?: Partial<CronJobState>;
};
