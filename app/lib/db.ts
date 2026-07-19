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
  const url =
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV === "production" ? "file:/tmp/dev.db" : "file:./dev.db");
  if (url === ":memory:") return ":memory:";

  let raw = url.replace(/^file:/, "");
  if (raw.startsWith("./")) raw = raw.slice(2);

  if (process.env.NODE_ENV === "production") {
    const target = path.join(os.tmpdir(), path.basename(raw));
    const source = path.resolve(process.cwd(), raw);
    try {
      if (!fs.existsSync(target) && fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      }
    } catch {
      // ignore copy errors and fall back to target path
    }
    return target;
  }

  if (path.isAbsolute(raw)) return raw;
  return path.resolve(process.cwd(), raw);
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
