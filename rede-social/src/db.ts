
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

export function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

  const adapter = new PrismaBetterSqlite3({
    url: dbUrl,
  });

  return new PrismaClient({ adapter });
}
