import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton
 * In development, we store the client on globalThis to prevent
 * multiple instances during hot reloading.
 *
 * Railway's proxy can drop idle connections, so we configure
 * Prisma to handle reconnection gracefully.
 */

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
