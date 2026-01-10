import { NextResponse } from 'next/server';
import { getProductsFromSheet } from '@/lib/sheets';

export async function GET() {
  try {
    const products = await getProductsFromSheet();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
