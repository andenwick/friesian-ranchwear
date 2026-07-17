import { spawnSync } from 'node:child_process';
import path from 'node:path';

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

const databaseUrl = new URL(rawDatabaseUrl);
const databaseName = databaseUrl.pathname.replace(/^\//, '');
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
  throw new Error('Integration tests require PostgreSQL');
}

if (!localHosts.has(databaseUrl.hostname) || databaseName !== 'friesian_test') {
  throw new Error(
    'Refusing to synchronize a database unless it is the local friesian_test database'
  );
}

function run(entrypoint, args) {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(path.resolve('node_modules/prisma/build/index.js'), ['db', 'push', '--skip-generate']);
run(path.resolve('node_modules/vitest/vitest.mjs'), [
  'run',
  '--config',
  'vitest.integration.config.js',
]);
