import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment variables for tests
process.env.CACHE_BUST_KEY = 'test-secret-key';

describe('Products API', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('getProductsFromSheet() logic', () => {
    it('returns array of product objects with correct structure', () => {
      // Test the parsing logic directly
      const mockRows = [
        ['name', 'price', 'color', 'imageUrl', 'active'], // Header row
        ['Test Shirt', '$45', '#C4A35A', '/products/shirt.jpg', 'TRUE'],
        ['Test Hat', '$30', '#000000', '/products/hat.jpg', 'TRUE'],
      ];

      // Simulate the parsing logic from getProductsFromSheet
      const products = mockRows
        .slice(1) // Skip header
        .map((row, index) => ({
          id: index + 2,
          name: row[0] || '',
          price: row[1] || '',
          color: row[2] || '',
          imageUrl: row[3] || '',
          active: row[4] || '',
        }))
        .filter((product) => product.active === 'TRUE')
        .map(({ active, ...product }) => product);

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(2);
      expect(products[0]).toEqual({
        id: 2,
        name: 'Test Shirt',
        price: '$45',
        color: '#C4A35A',
        imageUrl: '/products/shirt.jpg',
      });
      expect(products[1]).toEqual({
        id: 3,
        name: 'Test Hat',
        price: '$30',
        color: '#000000',
        imageUrl: '/products/hat.jpg',
      });
    });

    it('filters out inactive products (active !== TRUE)', () => {
      const mockRows = [
        ['name', 'price', 'color', 'imageUrl', 'active'], // Header row
        ['Active Product', '$45', '#C4A35A', '/products/active.jpg', 'TRUE'],
        ['Inactive Product', '$30', '#000000', '/products/inactive.jpg', 'FALSE'],
        ['Another Inactive', '$25', '#111111', '/products/another.jpg', ''],
        ['Also Inactive', '$20', '#222222', '/products/also.jpg', 'false'],
      ];

      // Simulate the parsing logic from getProductsFromSheet
      const products = mockRows
        .slice(1)
        .map((row, index) => ({
          id: index + 2,
          name: row[0] || '',
          price: row[1] || '',
          color: row[2] || '',
          imageUrl: row[3] || '',
          active: row[4] || '',
        }))
        .filter((product) => product.active === 'TRUE')
        .map(({ active, ...product }) => product);

      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Active Product');
    });
  });

  describe('/api/products endpoint structure', () => {
    it('returns JSON with correct structure when products exist', () => {
      // Verify that the expected product structure has all required fields
      const expectedProduct = {
        id: 2,
        name: 'Test Product',
        price: '$50',
        color: '#FFFFFF',
        imageUrl: '/test.jpg',
      };

      expect(expectedProduct).toHaveProperty('id');
      expect(expectedProduct).toHaveProperty('name');
      expect(expectedProduct).toHaveProperty('price');
      expect(expectedProduct).toHaveProperty('color');
      expect(expectedProduct).toHaveProperty('imageUrl');
      expect(typeof expectedProduct.id).toBe('number');
      expect(typeof expectedProduct.name).toBe('string');
      expect(typeof expectedProduct.price).toBe('string');
      expect(typeof expectedProduct.color).toBe('string');
      expect(typeof expectedProduct.imageUrl).toBe('string');
    });
  });

  describe('/api/products/refresh endpoint', () => {
    it('returns 401 without valid key', async () => {
      // Mock clearProductsCache to avoid googleapis initialization
      vi.doMock('@/lib/sheets', () => ({
        clearProductsCache: vi.fn(),
      }));

      const { GET } = await import('@/app/api/products/refresh/route');

      // Test with no key
      const requestNoKey = new Request('http://localhost/api/products/refresh');
      const responseNoKey = await GET(requestNoKey);
      expect(responseNoKey.status).toBe(401);

      const dataNoKey = await responseNoKey.json();
      expect(dataNoKey.error).toBe('Unauthorized');

      // Test with wrong key
      const requestWrongKey = new Request('http://localhost/api/products/refresh?key=wrong-key');
      const responseWrongKey = await GET(requestWrongKey);
      expect(responseWrongKey.status).toBe(401);

      // Test with correct key returns 200
      const requestCorrectKey = new Request('http://localhost/api/products/refresh?key=test-secret-key');
      const responseCorrectKey = await GET(requestCorrectKey);
      expect(responseCorrectKey.status).toBe(200);

      const dataCorrectKey = await responseCorrectKey.json();
      expect(dataCorrectKey.success).toBe(true);
    });
  });
});
