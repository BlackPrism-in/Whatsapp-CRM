import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter for direct DB connections.
// The connection string lives in the env, not the schema datasource block.
const connectionString = process.env.DATABASE_URL;

const createPrisma = () => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
