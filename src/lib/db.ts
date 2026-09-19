import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as {
  misFacturasPool?: Pool;
  misFacturasDb?: PrismaClient;
};

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return value;
}

export function getDb(): PrismaClient {
  if (!globalForDb.misFacturasDb) {
    const pool = new Pool({ connectionString: getDatabaseUrl() });
    globalForDb.misFacturasPool = pool;
    globalForDb.misFacturasDb = new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }
  return globalForDb.misFacturasDb;
}
