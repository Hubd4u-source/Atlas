
import { Database } from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

export async function loadSqliteVecExtension(params: {
    db: Database;
    extensionPath?: string;
}): Promise<{ ok: boolean; extensionPath?: string; error?: string }> {
    try {
        const resolvedPath = params.extensionPath?.trim() ? params.extensionPath.trim() : undefined;
        const extensionPath = resolvedPath ?? sqliteVec.getLoadablePath();

        // params.db.enableLoadExtension(true); // default in better-sqlite3? No, explicitly needed?
        // better-sqlite3 loadExtension handles it.

        params.db.loadExtension(extensionPath);

        return { ok: true, extensionPath };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
    }
}
