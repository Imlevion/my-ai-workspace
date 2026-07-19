import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Resolve DATABASE_URL the same way Prisma CLI does for SQLite.
 * file:./dev.db  → <projectRoot>/dev.db
 * file:/tmp/dev.db → /tmp/dev.db
 * In production, copy the built root DB to a writable /tmp path.
 */
function resolveDbPath() {
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL === ":memory:") return ":memory:";
    let raw = process.env.DATABASE_URL.replace(/^file:/, "");
    if (raw.startsWith("./")) raw = raw.slice(2);
    if (path.isAbsolute(raw)) return raw;
    return path.resolve(process.cwd(), raw);
  }

  // Default path is "dev.db" relative to project root
  const source = path.resolve(process.cwd(), "dev.db");

  if (process.env.NODE_ENV === "production") {
    const target = path.join(os.tmpdir(), "dev.db");
    try {
      // Always try to copy the latest build-time database to /tmp if not already present
      if (!fs.existsSync(target) && fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`Successfully copied database from ${source} to ${target}`);
      }
    } catch (err) {
      console.error("Failed to copy database:", err);
    }
    return target;
  }

  return source;
}

function createClient() {
  const dbPath = resolveDbPath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
