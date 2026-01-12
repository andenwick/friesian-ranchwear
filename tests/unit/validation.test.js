import { describe, it, expect } from 'vitest';
import { isValidEmail, EMAIL_REGEX } from '@/lib/validation';

describe('Email validation', () => {
  it('accepts valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+tag@example.org',
    ];

    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it('rejects invalid email addresses', () => {
    const invalidEmails = [
      'invalid',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
      '',
    ];

    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  it('handles null and undefined', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it('exports EMAIL_REGEX for direct use', () => {
    expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
  });
});
