import { describe, expect, it } from 'vitest';
import {
  hasSubscriberEmail,
  normalizeSubscriberEmail,
} from '@/lib/email-subscribers';

describe('email subscriber helpers', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeSubscriberEmail('  Customer@Example.com ')).toBe('customer@example.com');
  });

  it('recognizes an existing subscriber regardless of case', () => {
    const rows = [['Email', 'Date'], ['customer@example.com', '2026-07-14']];
    expect(hasSubscriberEmail(rows, 'Customer@Example.com')).toBe(true);
    expect(hasSubscriberEmail(rows, 'new@example.com')).toBe(false);
  });
});
