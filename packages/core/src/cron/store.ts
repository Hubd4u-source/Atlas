import fs from 'node:fs/promises';
import { CronJob, CronStoreFile } from './types.js';

export async function readCronStore(path: string): Promise<CronStoreFile> {
    try {
        const raw = await fs.readFile(path, 'utf8');
        const parsed = JSON.parse(raw) as CronStoreFile;
        if (parsed.version === 1 && Array.isArray(parsed.jobs)) {
            return parsed;
        }
    } catch (err: any) {
        if (err.code !== 'ENOENT') {
            console.warn(`Failed to read cron store at ${path}:`, err);
        }
    }
    return { version: 1, jobs: [] };
}

export async function writeCronStore(path: string, store: CronStoreFile): Promise<void> {
    const tmpPath = `${path}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf8');
    await fs.rename(tmpPath, path);
}

export async function upsertJob(path: string, job: CronJob): Promise<CronJob> {
    const store = await readCronStore(path);
    const idx = store.jobs.findIndex(j => j.id === job.id);

    job.updatedAtMs = Date.now();
    if (idx >= 0) {
        store.jobs[idx] = job;
    } else {
        job.createdAtMs = job.updatedAtMs;
        store.jobs.push(job);
    }

    await writeCronStore(path, store);
    return job;
}

export async function deleteJob(path: string, id: string): Promise<boolean> {
    const store = await readCronStore(path);
    const initialLen = store.jobs.length;
    store.jobs = store.jobs.filter(j => j.id !== id);
    if (store.jobs.length < initialLen) {
        await writeCronStore(path, store);
        return true;
    }
    return false;
}
