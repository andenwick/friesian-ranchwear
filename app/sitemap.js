import { prisma } from '@/lib/db';

const BASE_URL = 'https://friesianranchwear.com';

// Product list changes independently of deploys, and the DB isn't reachable
// at build time in all environments, so generate this per-request.
export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const staticRoutes = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, updatedAt: true },
  });

  const productRoutes = products.map((product) => ({
    url: `${BASE_URL}/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
