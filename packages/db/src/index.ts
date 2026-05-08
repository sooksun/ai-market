import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __aiMarketPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__aiMarketPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__aiMarketPrisma = prisma;
}

export * from '@prisma/client';
