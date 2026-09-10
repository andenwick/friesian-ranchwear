import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  tx: {
    product: { updateMany: vi.fn() },
    productVariant: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    orderItem: { count: vi.fn() },
    productImage: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ default: mocks.prisma, prisma: mocks.prisma }));
vi.mock('cloudinary', () => ({ v2: {} }));

import { PUT } from '@/app/api/admin/products/[id]/route';
import { inventoryRevision } from '@/lib/product-edit-version';

function request(body) {
  return new Request('http://localhost/api/admin/products/product_1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue({ user: { id: 'admin_1', isAdmin: true } });
  mocks.prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
  mocks.prisma.$transaction.mockImplementation((operation) => operation(mocks.tx));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('admin product optimistic concurrency', () => {
  it('rejects a stale form when checkout changed variant stock', async () => {
    mocks.tx.productVariant.findMany.mockResolvedValue([{
      id: 'variant_1',
      updatedAt: new Date('2026-09-10T12:00:01.000Z'),
    }]);

    const response = await PUT(request({
      name: 'Hat',
      basePrice: 42,
      variants: [{ id: 'variant_1', size: 'M', stock: 7 }],
      images: [],
      editVersion: {
        productUpdatedAt: '2026-09-10T12:00:00.000Z',
        inventoryRevision: inventoryRevision([{
          id: 'variant_1',
          stock: undefined,
          updatedAt: new Date('2026-09-10T12:00:00.000Z'),
        }]),
      },
    }), { params: Promise.resolve({ id: 'product_1' }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Product inventory changed while this page was open. Reload before saving.',
    });
    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('rechecks the admin role from the database', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ isAdmin: false });

    const response = await PUT(request({ name: 'Hat', basePrice: 42 }), {
      params: Promise.resolve({ id: 'product_1' }),
    });

    expect(response.status).toBe(401);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('detects a checkout decrement that races after the inventory read', async () => {
    const observedAt = new Date('2026-09-10T12:00:00.000Z');
    mocks.tx.productVariant.findMany.mockResolvedValue([{
      id: 'variant_1',
      stock: 7,
      updatedAt: observedAt,
    }]);
    mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });
    // The checkout updated stock and updatedAt after this request read the row.
    mocks.tx.productVariant.updateMany.mockResolvedValue({ count: 0 });

    const response = await PUT(request({
      name: 'Hat',
      basePrice: 42,
      variants: [{ id: 'variant_1', size: 'M', stock: 7 }],
      images: [],
      editVersion: {
        productUpdatedAt: '2026-09-10T12:00:00.000Z',
        inventoryRevision: inventoryRevision([{ id: 'variant_1', stock: 7, updatedAt: observedAt }]),
      },
    }), { params: Promise.resolve({ id: 'product_1' }) });

    expect(response.status).toBe(409);
    expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'variant_1', updatedAt: observedAt }),
      })
    );
  });
});
