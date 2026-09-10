import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backupPath = process.env.BACKUP_INPUT;
const manifestPath = process.env.RESTORE_MANIFEST;
const targetValue = process.env.RESTORE_DATABASE_URL;
const shadowValue = process.env.BASELINE_SHADOW_DATABASE_URL;
if (!backupPath || !manifestPath || !targetValue || !shadowValue) {
  throw new Error(
    'BACKUP_INPUT, RESTORE_MANIFEST, RESTORE_DATABASE_URL, and BASELINE_SHADOW_DATABASE_URL are required'
  );
}
function validateLocalDatabaseUrl(value, suffix) {
  const url = new URL(value);
  const database = url.pathname.replace(/^\//, '');
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    !database.endsWith(suffix) ||
    [...url.searchParams].length > 0
  ) {
    throw new Error(
      `Database URL must use PostgreSQL, a literal local host, no query parameters, and a ${suffix} database`
    );
  }
  return { database };
}

const target = validateLocalDatabaseUrl(targetValue, '_restore_test');
validateLocalDatabaseUrl(shadowValue, '_shadow_test');
await Promise.all([access(backupPath), access(manifestPath)]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, env: process.env });
    child.once('error', reject);
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} exited with code ${code}`)));
  });
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const countableTables = new Set([
  'User', 'Address', 'Product', 'ProductVariant', 'ProductImage',
  'Order', 'OrderItem', 'Review', 'CheckoutAttempt', 'StripeEvent',
  'FinancialOperation', 'AdminOrderEvent',
]);
if (!manifest?.counts || Object.keys(manifest.counts).length === 0) {
  throw new Error('Restore manifest must contain expected table row counts');
}
for (const [table, count] of Object.entries(manifest.counts)) {
  if (!countableTables.has(table) || !Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Invalid restore manifest count for ${table}`);
  }
}

await run('pg_restore', [
  '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error',
  '--dbname', targetValue, backupPath,
]);

process.env.DATABASE_URL = targetValue;
const { PrismaClient } = await import('@prisma/client');
let prisma = new PrismaClient();
const migrationTable = await prisma.$queryRaw`SELECT to_regclass('public._prisma_migrations')::text AS name`;
await prisma.$disconnect();

const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
if (!migrationTable[0].name) {
  const migrationRoot = fileURLToPath(new URL('../prisma/migrations', import.meta.url));
  const baselineDir = await mkdtemp(join(tmpdir(), 'friesian-baseline-'));
  try {
    await mkdir(join(baselineDir, '0_init'));
    await copyFile(join(migrationRoot, 'migration_lock.toml'), join(baselineDir, 'migration_lock.toml'));
    await copyFile(join(migrationRoot, '0_init', 'migration.sql'), join(baselineDir, '0_init', 'migration.sql'));
    await run(process.execPath, [
      prismaCli, 'migrate', 'diff',
      '--from-url', targetValue,
      '--to-migrations', baselineDir,
      '--shadow-database-url', shadowValue,
      '--exit-code',
    ]);
  } finally {
    await rm(baselineDir, { recursive: true, force: true });
  }
  await run(process.execPath, [prismaCli, 'migrate', 'resolve', '--applied', '0_init']);
}
await run(process.execPath, [prismaCli, 'migrate', 'deploy']);

prisma = new PrismaClient();
try {
  const [tables, migrationRows, integrity] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*)::int FROM "ProductVariant" WHERE stock < 0) AS negative_stock,
        (SELECT COUNT(*)::int FROM "Order" WHERE total < 0 OR "amountRefundedCents" < 0) AS invalid_money,
        (SELECT COUNT(*)::int FROM "OrderItem" i LEFT JOIN "Order" o ON o.id = i."orderId" WHERE o.id IS NULL) AS orphan_order_items,
        (SELECT COUNT(*)::int FROM "CheckoutAttempt" a LEFT JOIN "Order" o ON o.id = a."orderId" WHERE a."orderId" IS NOT NULL AND o.id IS NULL) AS orphan_attempts
    `,
  ]);
  if (tables[0].count < 10 || migrationRows[0].count < 2) {
    throw new Error('Restored schema or migration history is incomplete');
  }
  if (Object.values(integrity[0]).some(count => count !== 0)) {
    throw new Error(`Restored data integrity checks failed: ${JSON.stringify(integrity[0])}`);
  }

  const actualCounts = {};
  for (const [table, expected] of Object.entries(manifest.counts)) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    actualCounts[table] = rows[0].count;
    if (rows[0].count !== expected) {
      throw new Error(`Restored ${table} count ${rows[0].count} did not match manifest ${expected}`);
    }
  }

  console.log(JSON.stringify({
    localRestoreChecksPassed: true,
    database: target.database,
    publicTables: tables[0].count,
    appliedMigrations: migrationRows[0].count,
    manifestCounts: actualCounts,
    integrity: integrity[0],
    limitation: 'This local rehearsal does not prove provider backup scheduling, retention, or production RTO/RPO.',
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
