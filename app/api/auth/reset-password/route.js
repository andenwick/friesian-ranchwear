import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { MIN_PASSWORD_LENGTH, parseResetToken, verifyResetToken } from '@/lib/password-reset';

const INVALID = { error: 'This reset link is invalid or has expired. Request a new one.' };

export async function POST(request) {
  const ip = getClientIP(request);
  if (!rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000).success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let token;
  let password;
  try {
    ({ token, password } = await request.json());
  } catch {
    return NextResponse.json(INVALID, { status: 400 });
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const parsed = parseResetToken(token);
  if (!parsed) return NextResponse.json(INVALID, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, passwordHash: true },
    });
    if (!verifyResetToken(parsed, user, process.env.NEXTAUTH_SECRET)) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    // Conditional on the old hash: two submits of one link cannot both win.
    const updated = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash },
    });
    if (updated.count === 0) return NextResponse.json(INVALID, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    console.error(JSON.stringify({ event: 'password_reset_failed' }));
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
