import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import {
  ProductImageError,
  deleteProductImage,
  getSafeImageErrorDetails,
  uploadProductImage,
} from '@/lib/product-image-storage';

export const runtime = 'nodejs';

function imageErrorResponse(error, action) {
  if (error instanceof ProductImageError) {
    console.error(`Product image ${action} failed:`, getSafeImageErrorDetails(error));
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error(`Unexpected product image ${action} error:`, error);
  return Response.json(
    { error: `Failed to ${action} image`, code: 'IMAGE_UPLOAD_FAILED' },
    { status: 500 }
  );
}

export async function POST(request) {
  try {
    // Check admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    const result = await uploadProductImage({
      file,
      cloudinaryClient: cloudinary,
    });

    return Response.json(result);
  } catch (error) {
    return imageErrorResponse(error, 'upload');
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicId } = await request.json();

    await deleteProductImage({
      publicId,
      cloudinaryClient: cloudinary,
    });

    return Response.json({ success: true });
  } catch (error) {
    return imageErrorResponse(error, 'delete');
  }
}
