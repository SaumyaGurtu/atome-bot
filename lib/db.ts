import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Reuse one Prisma instance across hot reloads in `next dev`.
 * Without this, each reload can open new DB connections until the process exits.
 * Storing on `globalThis` is safe in production (one worker, one client).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl(): string {
  const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }
  const filePath = rawUrl.replace(/^file:/, "");
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  return `file:${absolute}`;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({
    url: resolveDatabaseUrl(),
  });
  return new PrismaClient({ adapter });
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

/** App-wide Prisma client (LibSQL / SQLite). */
export const prisma = globalForPrisma.prisma;

/** Same client as `prisma` — kept for call sites that prefer a getter-style name. */
export function getDb(): PrismaClient {
  return prisma;
}
