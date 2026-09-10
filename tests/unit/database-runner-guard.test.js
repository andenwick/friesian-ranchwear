import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('integration database target guard', () => {
  it.each(['host', 'hostaddr', 'service', 'dbname'])(
    'rejects the libpq override parameter %s before spawning Prisma',
    parameter => {
      const result = spawnSync(process.execPath, ['scripts/run-integration-tests.mjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL: `postgresql://postgres@127.0.0.1:55432/friesian_test?${parameter}=remote`,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        'Refusing to synchronize anything except local friesian_test with safe query parameters'
      );
      expect(result.stdout).not.toContain('Applying migration');
    }
  );
});

describe('restore database target guard', () => {
  it.each(['host', 'hostaddr', 'service', 'dbname'])(
    'rejects the libpq override parameter %s before file or pg_restore work',
    parameter => {
      const result = spawnSync(process.execPath, ['scripts/verify-backup-restore.mjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          BACKUP_INPUT: 'missing.dump',
          RESTORE_MANIFEST: 'missing.json',
          RESTORE_DATABASE_URL: `postgresql://postgres@127.0.0.1:55432/friesian_restore_test?${parameter}=remote`,
          BASELINE_SHADOW_DATABASE_URL: 'postgresql://postgres@127.0.0.1:55432/friesian_shadow_test',
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('literal local host, no query parameters');
      expect(result.stderr).not.toContain('ENOENT');
    }
  );
});
