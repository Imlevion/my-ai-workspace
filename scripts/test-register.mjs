import "dotenv/config";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "dev.db");
console.log("Using DB:", dbPath);

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

try {
  const count = await prisma.user.count();
  console.log("User count before:", count);

  const email = `test_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Test User",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });
  console.log("Created user:", user.id, user.email);
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Cleanup ok");
} catch (e) {
  console.error("FAILED:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
