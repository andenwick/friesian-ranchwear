import { NextResponse } from 'next/server';
import { clearProductsCache } from '@/lib/sheets';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Validate the cache bust key
    if (!key || key !== process.env.CACHE_BUST_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear the products cache
    clearProductsCache();

    return NextResponse.json(
      { success: true, message: 'Products cache cleared' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cache refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}
