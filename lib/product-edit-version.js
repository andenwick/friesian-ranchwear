import { createHash } from 'node:crypto';

export function inventoryRevision(variants) {
  const snapshot = variants
    .map(variant => ({
      id: variant.id,
      stock: variant.stock,
      updatedAt: variant.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
