
import { EventEmitter } from 'eventemitter3';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookRoute {
    name: string;
    path: string;
    handler: (payload: unknown, headers: Record<string, string>) => Promise<unknown>;
    description?: string;
    secret?: string;            // optional shared secret for HMAC validation
    createdAt: Date;
}

export interface WebhookEvent {
    name: string;
    payload: unknown;
    timestamp: string;
    source: string;
}

// ─── WebhookManager ──────────────────────────────────────────────────────────

export class WebhookManager extends EventEmitter {
    private routes: Map<string, WebhookRoute> = new Map();

    /**
     * Register a webhook route
     * @param name - unique name for this webhook (used as URL path segment)
     * @param handler - async function that processes incoming payloads
     * @param options - optional description and shared secret
     */
    register(
        name: string,
        handler: (payload: unknown, headers: Record<string, string>) => Promise<unknown>,
        options?: { description?: string; secret?: string }
    ): void {
        const route: WebhookRoute = {
            name,
            path: `/api/webhooks/${name}`,
            handler,
            description: options?.description,
            secret: options?.secret,
            createdAt: new Date(),
        };
        this.routes.set(name, route);
        console.log(`[Webhook] 🔗 Registered: ${route.path} — ${options?.description || name}`);
    }

    /**
     * Remove a webhook route
     */
    unregister(name: string): boolean {
        const existed = this.routes.delete(name);
        if (existed) {
            console.log(`[Webhook] 🗑️ Unregistered: /api/webhooks/${name}`);
        }
        return existed;
    }

    /**
     * Handle an incoming webhook request
     */
    async handleRequest(
        name: string,
        payload: unknown,
        headers: Record<string, string>
    ): Promise<{ status: number; body: unknown }> {
        const route = this.routes.get(name);
        if (!route) {
            return { status: 404, body: { error: `Webhook '${name}' not found` } };
        }

        // Optional secret validation
        if (route.secret) {
            const provided = headers['x-webhook-secret'] || headers['authorization'];
            if (!provided || provided !== `Bearer ${route.secret}`) {
                return { status: 401, body: { error: 'Unauthorized' } };
            }
        }

        try {
            const event: WebhookEvent = {
                name,
                payload,
                timestamp: new Date().toISOString(),
                source: headers['x-forwarded-for'] || headers['host'] || 'unknown',
            };
            this.emit('webhookReceived', event);

            const result = await route.handler(payload, headers);
            return { status: 200, body: result || { ok: true } };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[Webhook] ❌ Handler error for '${name}':`, message);
            this.emit('webhookError', { name, error: message });
            return { status: 500, body: { error: message } };
        }
    }

    /**
     * List all registered webhooks
     */
    listRoutes(): Array<{
        name: string;
        path: string;
        description?: string;
        hasSecret: boolean;
        createdAt: string;
    }> {
        return Array.from(this.routes.values()).map(r => ({
            name: r.name,
            path: r.path,
            description: r.description,
            hasSecret: !!r.secret,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    /**
     * Check if a webhook route exists
     */
    has(name: string): boolean {
        return this.routes.has(name);
    }

    /**
     * Get total route count
     */
    get count(): number {
        return this.routes.size;
    }
}
