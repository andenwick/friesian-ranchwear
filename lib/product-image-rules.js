export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const SUPPORTED_PRODUCT_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'heic',
  'heif',
]);

export const PRODUCT_IMAGE_TYPE_ERROR =
  'Use a JPG, PNG, WebP, HEIC, or AVIF image.';

export function isSupportedProductImage(file) {
  const mimeType = file?.type?.toLowerCase();
  if (SUPPORTED_PRODUCT_IMAGE_TYPES.has(mimeType)) return true;

  const extension = file?.name?.split('.').pop()?.toLowerCase();
  return !mimeType && SUPPORTED_PRODUCT_IMAGE_EXTENSIONS.has(extension);
}
