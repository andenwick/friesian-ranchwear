/**
 * Converts Google Drive share links to proxied image URLs (for frontend use).
 */
export function convertDriveUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/image')) return url;
  if (url.startsWith('/')) return url;

  let fileId = null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];

  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) fileId = idMatch[1];
  }

  if (fileId) return `/api/image?id=${fileId}`;
  return url;
}

/**
 * Converts Google Drive URLs to thumbnail format (for API/server use).
 */
export function convertImageUrl(url) {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    let fileId = null;
    if (url.includes('/file/d/')) {
      fileId = url.match(/\/d\/([^/]+)/)?.[1];
    } else if (url.includes('id=')) {
      fileId = url.match(/id=([^&]+)/)?.[1];
    }
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
    }
  }
  return url;
}
