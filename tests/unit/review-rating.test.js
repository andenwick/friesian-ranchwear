import { describe, expect, it } from 'vitest';
import {
  decodeReviewRating,
  encodeReviewRating,
  isValidReviewRating,
} from '@/lib/review-rating';

describe('review rating storage', () => {
  it('stores half-star ratings as integer units', () => {
    expect(encodeReviewRating(4.5)).toBe(9);
    expect(decodeReviewRating(9)).toBe(4.5);
  });

  it('accepts only half-star increments from 0.5 through 5', () => {
    expect(isValidReviewRating(0.5)).toBe(true);
    expect(isValidReviewRating(5)).toBe(true);
    expect(isValidReviewRating(4.2)).toBe(false);
    expect(isValidReviewRating(0)).toBe(false);
    expect(isValidReviewRating(5.5)).toBe(false);
  });
});
