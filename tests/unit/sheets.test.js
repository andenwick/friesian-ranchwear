import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  append: vi.fn(),
  get: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn() },
    sheets: vi.fn(() => ({
      spreadsheets: {
        values: {
          append: mocks.append,
          get: mocks.get,
        },
      },
    })),
  },
}));

import { appendToSheet } from '@/lib/sheets';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.append.mockResolvedValue({ data: { updatedRows: 1 } });
});

describe('Google Sheets subscriber storage', () => {
  it('writes public subscriber input as literal values', async () => {
    const values = ['=1+1@example.com', '2026-09-09T00:00:00.000Z'];

    await appendToSheet(values);

    expect(mocks.append).toHaveBeenCalledWith(expect.objectContaining({
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    }));
  });
});
