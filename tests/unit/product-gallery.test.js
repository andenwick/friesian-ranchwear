import { describe, expect, it } from 'vitest';
import { getProductImages } from '../../lib/image-utils';

describe('getProductImages', () => {
  it('uses the ordered database image records returned by the products API', () => {
    expect(getProductImages({
      images: [
        { url: 'primary.jpg', alt: 'Front view' },
        { url: 'secondary.jpg', alt: 'Alternate view' },
      ],
      imageUrl: 'primary.jpg',
    })).toEqual([
      { url: 'primary.jpg', alt: 'Front view' },
      { url: 'secondary.jpg', alt: 'Alternate view' },
    ]);
  });

  it('supports legacy imageUrls and single-image responses without duplicates', () => {
    expect(getProductImages({
      imageUrls: ['one.jpg', 'two.jpg'],
      imageUrl: 'one.jpg',
    })).toEqual([
      { url: 'one.jpg', alt: '' },
      { url: 'two.jpg', alt: '' },
    ]);
  });

  it('ignores missing and malformed image entries', () => {
    expect(getProductImages({ images: [null, {}, { url: '' }] })).toEqual([]);
  });
});
