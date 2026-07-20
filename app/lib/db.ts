import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Resolve DATABASE_URL the same way Prisma CLI does for SQLite.
 * file:./dev.db  → <projectRoot>/dev.db
 * file:/tmp/dev.db → /tmp/dev.db
 * In production or sandboxed/read-only cloud environments, copy the built root DB to a writable /tmp path.
 */
function resolveDbPath() {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  
  if (dbUrl === ":memory:") return ":memory:";
  
  let raw = dbUrl.replace(/^file:/, "");
  if (raw.startsWith("./")) raw = raw.slice(2);
  
  const source = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);

  // Check if we are running in a restricted/cloud environment (like Vercel or Google AI Studio)
  // where the project root is read-only or not meant for persistent SQLite writes.
  const isCloud =
    process.env.NODE_ENV === "production" ||
    !!process.env.VERCEL ||
    !!process.env.AI_STUDIO ||
    (() => {
      try {
        const testFile = path.join(process.cwd(), ".write-test-" + Math.random());
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        return false; // writable local environment
      } catch {
        return true; // read-only/sandboxed environment
      }
    })();

  if (isCloud) {
    const target = path.join(os.tmpdir(), path.basename(source));
    try {
      // Always ensure the target exists and copy the base db if needed
      if (!fs.existsSync(target)) {
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, target);
          console.log(`Successfully copied database from ${source} to ${target}`);
        } else {
          // If source doesn't exist, create an empty file so Prisma can use it
          fs.writeFileSync(target, "");
          console.log(`Created empty database at ${target}`);
        }
      }
    } catch (err) {
      console.error("Failed to setup cloud database path:", err);
    }
    return target;
  }

  return source;
}

import { execSync } from "child_process";

function createClient() {
  const dbPath = resolveDbPath();
  
  if (dbPath !== ":memory:") {
    try {
      const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
      if (!stats || stats.size === 0) {
        console.log("Database file is new or empty. Running prisma db push programmatically...");
        execSync("npx prisma db push --accept-data-loss", {
          env: {
            ...process.env,
            DATABASE_URL: `file:${dbPath}`
          },
          stdio: "inherit"
        });
        console.log("Database schema pushed successfully.");
      }
    } catch (err) {
      console.error("Failed to push schema programmatically:", err);
    }
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
