const BASE_URL = 'https://friesianranchwear.com';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/account', '/checkout'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
