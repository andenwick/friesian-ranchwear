import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date();
const staleCheckoutBefore = new Date(now.getTime() - 30 * 60 * 1000);

try {
  const [financialOperations, stripeEvents, checkoutAttempts] = await Promise.all([
    prisma.financialOperation.findMany({
      where: { status: { not: 'SUCCEEDED' } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        kind: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        lastAttemptAt: true,
      },
    }),
    prisma.stripeEvent.findMany({
      where: { status: { not: 'PROCESSED' } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        orderId: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
      },
    }),
    prisma.checkoutAttempt.findMany({
      where: {
        status: { in: ['INITIALIZING', 'TAX_READY', 'RESERVED', 'RECONCILE'] },
        createdAt: { lte: staleCheckoutBefore },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        status: true,
        lastError: true,
        createdAt: true,
        paymentCallStartedAt: true,
      },
    }),
  ]);

  const report = {
    generatedAt: now.toISOString(),
    counts: {
      financialOperations: financialOperations.length,
      stripeEvents: stripeEvents.length,
      staleCheckoutAttempts: checkoutAttempts.length,
    },
    financialOperations,
    stripeEvents,
    staleCheckoutAttempts: checkoutAttempts,
  };
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report.counts).some(count => count > 0)) process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
