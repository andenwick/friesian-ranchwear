import { describe, it, expect } from 'vitest';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('Email validation', () => {
  it('accepts valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+tag@example.org',
    ];

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
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
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});
