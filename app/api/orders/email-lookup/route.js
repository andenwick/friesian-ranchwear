import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidEmail } from '@/lib/validation';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { emailLinkBase, sendEmail } from '@/lib/email';
import { orderLookupEmail } from '@/lib/email-templates';

const PAID_STATES = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];

// The list goes only to the inbox that placed the orders. The response never says
// whether orders exist, so this can't be used to probe someone else's email.
const GENERIC = { ok: true, message: 'If we have orders for that email, we just sent them there.' };

// POST /api/orders/email-lookup - Email a customer their order history
export async function POST(request) {
  const ip = getClientIP(request);
  if (!rateLimit(`order-email-lookup:${ip}`, 5, 15 * 60 * 1000).success) {
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

  if (!rateLimit(`order-email-lookup-address:${normalized}`, 3, 60 * 60 * 1000).success) {
    return NextResponse.json(GENERIC);
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: PAID_STATES },
        OR: [
          { guestEmail: { equals: normalized, mode: 'insensitive' } },
          { user: { email: normalized } },
        ],
      },
      select: { id: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (orders.length > 0) {
      const account = await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true },
      });
      await sendEmail({
        to: normalized,
        ...orderLookupEmail(orders, { linkBase: emailLinkBase(), hasAccount: Boolean(account) }),
      });
    }
  } catch {
    console.error(JSON.stringify({ event: 'order_email_lookup_failed' }));
  }

  return NextResponse.json(GENERIC);
}
