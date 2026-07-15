import { NextResponse } from 'next/server';
import { appendToSheet, getSheetData } from '@/lib/sheets';
import { isValidEmail } from '@/lib/validation';
import { hasSubscriberEmail, normalizeSubscriberEmail } from '@/lib/email-subscribers';
import { getClientIP, rateLimit } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeSubscriberEmail(body.email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const limiter = rateLimit(`subscribe:${getClientIP(request)}`, 5, 60000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    const rows = await getSheetData();
    if (hasSubscriberEmail(rows, email)) {
      return NextResponse.json(
        { success: true, message: 'You are already subscribed' },
        { status: 200 }
      );
    }

    const timestamp = new Date().toISOString();
    await appendToSheet([email, timestamp]);

    return NextResponse.json(
      { success: true, message: 'Successfully subscribed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
