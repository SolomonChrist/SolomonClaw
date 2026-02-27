import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { resolve } from "path";
import { logger } from "../utils/logger.js";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle> | null = null;

export function initDB(dbPath: string = "/data/secureclaw.db"): void {
  try {
    const sqlite = new Database(resolve(dbPath));

    // Enable WAL mode for better concurrency
    sqlite.pragma("journal_mode = WAL");
    // Use NORMAL synchronous mode (safer than OFF, faster than FULL)
    sqlite.pragma("synchronous = NORMAL");

    db = drizzle(sqlite, { schema });
    logger.info({ path: dbPath }, "Database initialized");
  } catch (error) {
    logger.error({ error, path: dbPath }, "Failed to initialize database");
    throw error;
  }
}

export function getDB(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initDB() before getDB()"
    );
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (db) {
    try {
      const sqlite = (db as any)._.client;
      sqlite.close();
      db = null;
      logger.info("Database closed");
    } catch (error) {
      logger.error({ error }, "Failed to close database");
    }
  }
}
