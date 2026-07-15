import { File } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  ProductImageError,
  deleteProductImage,
  getCloudinaryConfig,
  getProductImagePublicId,
  getSafeImageErrorDetails,
  uploadProductImage,
  validateProductImage,
} from '@/lib/product-image-storage';

const validEnvironment = {
  CLOUDINARY_CLOUD_NAME: 'friesian-cloud',
  CLOUDINARY_API_KEY: 'api-key',
  CLOUDINARY_API_SECRET: 'api-secret',
};

function createImageFile({
  contents = 'image bytes',
  name = 'hat.jpg',
  type = 'image/jpeg',
} = {}) {
  return new File([contents], name, { type });
}

function createCloudinaryClient({ uploadError, uploadResult } = {}) {
  const config = vi.fn();
  const uploadStream = vi.fn((options, callback) => ({
    end: vi.fn(() => {
      callback(
        uploadError || null,
        uploadResult || {
          secure_url: 'https://res.cloudinary.com/friesian-cloud/image/upload/hat.jpg',
          public_id: 'friesian-ranchwear/products/hat',
          width: 1200,
          height: 1600,
        }
      );
    }),
  }));
  const destroy = vi.fn().mockResolvedValue({ result: 'ok' });

  return {
    config,
    uploader: {
      upload_stream: uploadStream,
      destroy,
    },
  };
}

describe('product image storage', () => {
  describe('Cloudinary configuration', () => {
    it('returns a trimmed Cloudinary configuration', () => {
      expect(getCloudinaryConfig({
        CLOUDINARY_CLOUD_NAME: ' friesian-cloud ',
        CLOUDINARY_API_KEY: ' api-key ',
        CLOUDINARY_API_SECRET: ' api-secret ',
      })).toEqual({
        cloud_name: 'friesian-cloud',
        api_key: 'api-key',
        api_secret: 'api-secret',
        secure: true,
      });
    });

    it('fails clearly when required configuration is missing', () => {
      expect(() => getCloudinaryConfig({})).toThrowError(
        expect.objectContaining({
          code: 'IMAGE_STORAGE_NOT_CONFIGURED',
          status: 503,
        })
      );
    });
  });

  describe('file validation', () => {
    it('accepts common web and phone image formats', () => {
      for (const type of [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'image/heic',
        'image/heif',
      ]) {
        expect(validateProductImage(createImageFile({ type }))).toBeInstanceOf(File);
      }
    });

    it('accepts a known image extension when the browser omits the MIME type', () => {
      expect(validateProductImage(createImageFile({
        name: 'phone-photo.HEIC',
        type: '',
      }))).toBeInstanceOf(File);
    });

    it('rejects an empty image', () => {
      expect(() => validateProductImage(createImageFile({ contents: '' }))).toThrowError(
        expect.objectContaining({ code: 'IMAGE_EMPTY', status: 400 })
      );
    });

    it('rejects unsupported file types', () => {
      expect(() => validateProductImage(createImageFile({ type: 'image/svg+xml' }))).toThrowError(
        expect.objectContaining({ code: 'IMAGE_TYPE_UNSUPPORTED', status: 415 })
      );
    });

    it('rejects images larger than 10MB', () => {
      const oversizedImage = createImageFile({
        contents: new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1),
      });

      expect(() => validateProductImage(oversizedImage)).toThrowError(
        expect.objectContaining({ code: 'IMAGE_TOO_LARGE', status: 413 })
      );
    });
  });

  describe('uploads', () => {
    it('configures Cloudinary and returns normalized upload data', async () => {
      const cloudinaryClient = createCloudinaryClient();

      const result = await uploadProductImage({
        file: createImageFile(),
        cloudinaryClient,
        environment: validEnvironment,
      });

      expect(cloudinaryClient.config).toHaveBeenCalledWith({
        cloud_name: 'friesian-cloud',
        api_key: 'api-key',
        api_secret: 'api-secret',
        secure: true,
      });
      expect(cloudinaryClient.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'friesian-ranchwear/products',
          resource_type: 'image',
        }),
        expect.any(Function)
      );
      expect(result).toEqual({
        url: 'https://res.cloudinary.com/friesian-cloud/image/upload/hat.jpg',
        publicId: 'friesian-ranchwear/products/hat',
        width: 1200,
        height: 1600,
      });
    });

    it('converts provider failures into safe public errors', async () => {
      const providerError = Object.assign(new Error('Invalid Signature secret-value'), {
        http_code: 401,
      });
      const cloudinaryClient = createCloudinaryClient({ uploadError: providerError });

      await expect(uploadProductImage({
        file: createImageFile(),
        cloudinaryClient,
        environment: validEnvironment,
      })).rejects.toMatchObject({
        code: 'IMAGE_STORAGE_UPLOAD_FAILED',
        status: 502,
        message: 'The image storage service rejected the upload. Try again or contact site support.',
      });
    });
  });

  describe('deletes', () => {
    it('configures Cloudinary before deleting a stored image', async () => {
      const cloudinaryClient = createCloudinaryClient();

      await deleteProductImage({
        publicId: 'friesian-ranchwear/products/hat',
        cloudinaryClient,
        environment: validEnvironment,
      });

      expect(cloudinaryClient.config).toHaveBeenCalledOnce();
      expect(cloudinaryClient.uploader.destroy).toHaveBeenCalledWith(
        'friesian-ranchwear/products/hat'
      );
    });

    it('derives the stored image identifier from its Cloudinary URL', () => {
      expect(getProductImagePublicId(
        'https://res.cloudinary.com/friesian-cloud/image/upload/v123/friesian-ranchwear/products/black-hat.webp',
        validEnvironment
      )).toBe('friesian-ranchwear/products/black-hat');
    });

    it('does not derive identifiers for unrelated Cloudinary folders', () => {
      expect(getProductImagePublicId(
        'https://res.cloudinary.com/friesian-cloud/image/upload/v123/other/customer-photo.jpg',
        validEnvironment
      )).toBeNull();
    });

    it('can delete a saved image using only its delivery URL', async () => {
      const cloudinaryClient = createCloudinaryClient();

      await deleteProductImage({
        url: 'https://res.cloudinary.com/friesian-cloud/image/upload/v123/friesian-ranchwear/products/black-hat.webp',
        cloudinaryClient,
        environment: validEnvironment,
      });

      expect(cloudinaryClient.uploader.destroy).toHaveBeenCalledWith(
        'friesian-ranchwear/products/black-hat'
      );
    });
  });

  it('returns safe operational details for server logs', () => {
    const providerError = Object.assign(new Error('Provider rejected request'), {
      http_code: 401,
    });
    const error = new ProductImageError('Safe public message', {
      code: 'IMAGE_STORAGE_UPLOAD_FAILED',
      status: 502,
      cause: providerError,
    });

    expect(getSafeImageErrorDetails(error)).toEqual({
      code: 'IMAGE_STORAGE_UPLOAD_FAILED',
      message: 'Safe public message',
      providerError: 'Error',
      providerStatus: 401,
    });
  });
});
