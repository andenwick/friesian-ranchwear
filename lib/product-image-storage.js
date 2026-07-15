import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_TYPE_ERROR,
  SUPPORTED_PRODUCT_IMAGE_TYPES,
  isSupportedProductImage,
} from '@/lib/product-image-rules';

const REQUIRED_CLOUDINARY_VARIABLES = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

export { MAX_PRODUCT_IMAGE_BYTES, SUPPORTED_PRODUCT_IMAGE_TYPES };

export class ProductImageError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message, { cause });
    this.name = 'ProductImageError';
    this.code = code || 'IMAGE_UPLOAD_FAILED';
    this.status = status || 500;
  }
}

export function getCloudinaryConfig(environment = process.env) {
  const missingVariables = REQUIRED_CLOUDINARY_VARIABLES.filter(
    (name) => !environment[name]?.trim()
  );

  if (missingVariables.length > 0) {
    throw new ProductImageError(
      'Image uploads are temporarily unavailable. Contact site support.',
      {
        code: 'IMAGE_STORAGE_NOT_CONFIGURED',
        status: 503,
        cause: new Error(`Missing environment variables: ${missingVariables.join(', ')}`),
      }
    );
  }

  return {
    cloud_name: environment.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: environment.CLOUDINARY_API_KEY.trim(),
    api_secret: environment.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  };
}

export function validateProductImage(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new ProductImageError('No image was provided.', {
      code: 'IMAGE_MISSING',
      status: 400,
    });
  }

  if (file.size === 0) {
    throw new ProductImageError('The selected image is empty.', {
      code: 'IMAGE_EMPTY',
      status: 400,
    });
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageError('Image must be 10MB or smaller.', {
      code: 'IMAGE_TOO_LARGE',
      status: 413,
    });
  }

  if (!isSupportedProductImage(file)) {
    throw new ProductImageError(PRODUCT_IMAGE_TYPE_ERROR, {
      code: 'IMAGE_TYPE_UNSUPPORTED',
      status: 415,
    });
  }

  return file;
}

export function getProductImagePublicId(url, environment = process.env) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'res.cloudinary.com') return null;

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const configuredCloudName = environment.CLOUDINARY_CLOUD_NAME?.trim();
    if (configuredCloudName && segments[0] !== configuredCloudName) return null;

    const folderIndex = segments.indexOf('friesian-ranchwear');
    if (folderIndex < 0 || segments[folderIndex + 1] !== 'products') return null;

    const publicIdSegments = segments.slice(folderIndex).map(decodeURIComponent);
    const lastIndex = publicIdSegments.length - 1;
    publicIdSegments[lastIndex] = publicIdSegments[lastIndex].replace(/\.[^.]+$/, '');

    return publicIdSegments.join('/');
  } catch {
    return null;
  }
}

export async function uploadProductImage({
  file,
  cloudinaryClient,
  environment = process.env,
}) {
  validateProductImage(file);
  cloudinaryClient.config(getCloudinaryConfig(environment));

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinaryClient.uploader
        .upload_stream(
          {
            folder: 'friesian-ranchwear/products',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 1600, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, uploadResult) => {
            if (error) reject(error);
            else resolve(uploadResult);
          }
        )
        .end(buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    throw new ProductImageError(
      'The image storage service rejected the upload. Try again or contact site support.',
      {
        code: 'IMAGE_STORAGE_UPLOAD_FAILED',
        status: 502,
        cause: error,
      }
    );
  }
}

export async function deleteProductImage({
  publicId,
  url,
  cloudinaryClient,
  environment = process.env,
}) {
  const resolvedPublicId = publicId || getProductImagePublicId(url, environment);

  if (!resolvedPublicId || typeof resolvedPublicId !== 'string') {
    throw new ProductImageError('No image identifier was provided.', {
      code: 'IMAGE_ID_MISSING',
      status: 400,
    });
  }

  cloudinaryClient.config(getCloudinaryConfig(environment));

  try {
    await cloudinaryClient.uploader.destroy(resolvedPublicId);
  } catch (error) {
    throw new ProductImageError('Failed to remove the stored image.', {
      code: 'IMAGE_STORAGE_DELETE_FAILED',
      status: 502,
      cause: error,
    });
  }
}

export function getSafeImageErrorDetails(error) {
  const cause = error?.cause;
  const isConfigurationError = error?.code === 'IMAGE_STORAGE_NOT_CONFIGURED';

  return {
    code: error?.code || 'IMAGE_UPLOAD_FAILED',
    message: isConfigurationError
      ? cause?.message
      : error?.message || 'Unknown image upload error',
    providerError: cause?.name || null,
    providerStatus: cause?.http_code || cause?.statusCode || null,
  };
}
