import { spawnSync } from 'node:child_process';
import path from 'node:path';

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is required for integration tests');
}

const databaseUrl = new URL(rawDatabaseUrl);
const databaseName = databaseUrl.pathname.replace(/^\//, '');
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const allowedQueryParameters = new Set(['schema', 'connection_limit']);
const hasUnsafeQueryParameter = [...databaseUrl.searchParams.keys()]
  .some(key => !allowedQueryParameters.has(key));
const schema = databaseUrl.searchParams.get('schema');
const connectionLimit = databaseUrl.searchParams.get('connection_limit');

if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
  throw new Error('Integration tests require PostgreSQL');
}

if (
  !localHosts.has(databaseUrl.hostname) ||
  databaseName !== 'friesian_test' ||
  hasUnsafeQueryParameter ||
  (schema && schema !== 'public') ||
  (connectionLimit && !/^\d+$/.test(connectionLimit))
) {
  throw new Error(
    'Refusing to synchronize anything except local friesian_test with safe query parameters'
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

run(path.resolve('node_modules/prisma/build/index.js'), [
  'migrate',
  'reset',
  '--force',
  '--skip-seed',
]);
run(path.resolve('node_modules/vitest/vitest.mjs'), [
  'run',
  '--config',
  'vitest.integration.config.js',
]);
