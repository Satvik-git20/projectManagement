import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const file = raw.replace(/^file:/, "");
  return path.isAbsolute(file)
    ? file
    : path.join(/* turbopackIgnore: true */ process.cwd(), file);
}

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
