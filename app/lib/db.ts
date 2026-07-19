import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Resolve DATABASE_URL the same way Prisma CLI does for SQLite.
 * file:./dev.db  → <projectRoot>/dev.db
 * file:./prisma/dev.db → <projectRoot>/prisma/dev.db
 * In production, use a writable temp path if the repo root is not writable.
 */
function resolveDbPath() {
  const url =
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV === "production" ? "file:/tmp/dev.db" : "file:./dev.db");
  if (url === ":memory:") return ":memory:";

  let raw = url.replace(/^file:/, "");
  if (raw.startsWith("./")) raw = raw.slice(2);

  if (path.isAbsolute(raw)) return raw;
  if (process.env.NODE_ENV === "production") {
    return path.join(os.tmpdir(), raw);
  }
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
