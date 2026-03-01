import { Cron } from 'croner';
import { CronSchedule } from './types.js';

export function resolveNextRun(schedule: CronSchedule, nowMs: number): number | null {
    try {
        if (schedule.kind === 'at') {
            const ms = new Date(schedule.at).getTime();
            return isNaN(ms) || ms <= nowMs ? null : ms;
        }

        if (schedule.kind === 'every') {
            const anchor = schedule.anchorMs || nowMs;
            const elapsed = Math.max(0, nowMs - anchor);
            const cycles = Math.floor(elapsed / Math.max(1, schedule.everyMs));
            return anchor + (cycles + 1) * schedule.everyMs;
        }

        if (schedule.kind === 'cron') {
            const cron = new Cron(schedule.expr, {
                timezone: schedule.tz,
            });
            const nextDate = cron.nextRun(new Date(nowMs));
            if (!nextDate) return null;

            let nextMs = nextDate.getTime();

            // Calculate deterministic stagger
            if (schedule.staggerMs && schedule.staggerMs > 0) {
                // pseudo-random but deterministic stagger based on hour/day
                const seed = nextMs % 1000000;
                const stagger = (seed % schedule.staggerMs);
                nextMs += stagger;
            }

            return nextMs;
        }
    } catch (err) {
        console.error('Failed to parse cron schedule', err);
        return null;
    }
    return null;
}
