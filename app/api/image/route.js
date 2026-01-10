import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 });
  }

  try {
    // First get the redirect URL
    const initialResponse = await fetch(
      `https://drive.google.com/uc?export=view&id=${id}`,
      { redirect: 'manual' }
    );

    // Get the redirect location
    const redirectUrl = initialResponse.headers.get('location');

    if (!redirectUrl) {
      return new NextResponse('No redirect URL found', { status: 500 });
    }

    // Fetch from the redirect URL
    const response = await fetch(redirectUrl);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
