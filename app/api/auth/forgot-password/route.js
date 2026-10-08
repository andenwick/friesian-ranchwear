import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidEmail } from '@/lib/validation';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { emailLinkBase, sendEmail } from '@/lib/email';
import { passwordResetEmail } from '@/lib/email-templates';
import { createResetToken, RESET_TOKEN_MINUTES } from '@/lib/password-reset';

const WINDOW_MS = 15 * 60 * 1000;

// Same answer whether or not the account exists, so this can't be used to probe emails.
const GENERIC = { ok: true, message: 'If that email has an account, a reset link is on its way.' };

export async function POST(request) {
  const ip = getClientIP(request);
  if (!rateLimit(`forgot-password:${ip}`, 5, WINDOW_MS).success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (typeof email !== 'string' || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();

  // Per-address limit stops someone flooding a customer's inbox; still answer generically.
  if (!rateLimit(`forgot-password-email:${normalized}`, 3, WINDOW_MS).success) {
    return NextResponse.json(GENERIC);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, passwordHash: true },
    });
    if (user?.passwordHash) {
      const token = createResetToken(user, process.env.NEXTAUTH_SECRET);
      const resetUrl = `${emailLinkBase()}/auth/reset?token=${encodeURIComponent(token)}`;
      await sendEmail({ to: user.email, ...passwordResetEmail({ resetUrl, minutes: RESET_TOKEN_MINUTES }) });
    }
  } catch {
    console.error(JSON.stringify({ event: 'password_reset_request_failed' }));
  }

  return NextResponse.json(GENERIC);
}
