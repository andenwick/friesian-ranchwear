import { SITE_NAME } from '@/lib/site';

export const metadata = {
  // A plain string here would stop the root title template reaching product pages.
  title: { default: 'Shop', template: `%s | ${SITE_NAME}` },
  description: 'Shop the Friesian Ranchwear collection.',
  alternates: { canonical: '/products' },
};

export default function ProductsLayout({ children }) {
  return children;
}
