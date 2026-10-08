import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createResetToken,
  parseResetToken,
  RESET_TOKEN_MINUTES,
  verifyResetToken,
} from '../../lib/password-reset';

const SECRET = 'test-secret-at-least-16-chars';
const user = { id: 'cmuser0000000000001', passwordHash: '$2a$12$abcdefghijklmnopqrstuv' };
const NOW = 1_790_000_000_000;

describe('password reset tokens', () => {
  it('round-trips for the same user and password hash', () => {
    const token = createResetToken(user, SECRET, NOW);
    const parsed = parseResetToken(token);
    expect(parsed.userId).toBe(user.id);
    expect(verifyResetToken(parsed, user, SECRET, NOW + 1000)).toBe(true);
  });

  it('expires after the reset window', () => {
    const parsed = parseResetToken(createResetToken(user, SECRET, NOW));
    expect(verifyResetToken(parsed, user, SECRET, NOW + RESET_TOKEN_MINUTES * 60 * 1000)).toBe(false);
  });

  it('stops working once the password changes', () => {
    const parsed = parseResetToken(createResetToken(user, SECRET, NOW));
    expect(verifyResetToken(parsed, { ...user, passwordHash: '$2a$12$changed' }, SECRET, NOW)).toBe(false);
  });

  it('rejects tampering, other users, other secrets and malformed input', () => {
    const token = createResetToken(user, SECRET, NOW);
    const parsed = parseResetToken(token);
    const longer = parseResetToken(token.replace(/\.(\d{13})\./, (_, ms) => `.${Number(ms) + 999999}.`));
    expect(verifyResetToken(longer, user, SECRET, NOW)).toBe(false);
    expect(verifyResetToken(parsed, { ...user, id: 'cmuser0000000000002' }, SECRET, NOW)).toBe(false);
    expect(verifyResetToken(parsed, user, 'another-secret-16-chars', NOW)).toBe(false);
    for (const bad of [null, '', 'a.b', 'a.b.c.d', `${user.id}.123.sig`, 'x'.repeat(400)]) {
      expect(parseResetToken(bad)).toBeNull();
    }
  });

  it('refuses to run without a real secret', () => {
    expect(() => createResetToken(user, '', NOW)).toThrow();
  });
});

const mocks = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } },
  sendEmail: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/auth', () => ({ hashPassword: mocks.hashPassword }));
vi.mock('@/lib/email', () => ({
  sendEmail: mocks.sendEmail,
  emailLinkBase: () => 'https://shop.test',
}));

const { POST: forgot } = await import('@/app/api/auth/forgot-password/route');
const { POST: reset } = await import('@/app/api/auth/reset-password/route');

let ipCounter = 0;
function post(body) {
  ipCounter += 1;
  return new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ipCounter}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env.NEXTAUTH_SECRET = SECRET;
  mocks.sendEmail.mockResolvedValue({ sent: true });
  mocks.hashPassword.mockResolvedValue('$2a$12$newhash');
  mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/auth/forgot-password', () => {
  it('emails a reset link to an existing account', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...user, email: 'member@example.com' });

    const response = await forgot(post({ email: ' Member@Example.com ' }));

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'member@example.com' },
    }));
    const message = mocks.sendEmail.mock.calls[0][0];
    expect(message.to).toBe('member@example.com');
    expect(message.text).toMatch(/https:\/\/shop\.test\/auth\/reset\?token=cmuser0000000000001\.\d{13}\./);
  });

  it('answers identically when no account exists', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...user, email: 'member@example.com' });
    const known = await (await forgot(post({ email: 'member2@example.com' }))).json();
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    const unknown = await (await forgot(post({ email: 'nobody@example.com' }))).json();

    expect(unknown).toEqual(known);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed email', async () => {
    const response = await forgot(post({ email: 'not-an-email' }));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('sets the new password only while the old hash is unchanged', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(user);
    const token = createResetToken(user, SECRET);

    const response = await reset(post({ token, password: 'new-password-1' }));

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash: '$2a$12$newhash' },
    });
  });

  it('rejects a reused link', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(user);
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 });
    const token = createResetToken(user, SECRET);

    const response = await reset(post({ token, password: 'new-password-1' }));
    expect(response.status).toBe(400);
  });

  it('rejects bad tokens and short passwords without writing', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: '$2a$12$changed' });
    const stale = createResetToken(user, SECRET);
    expect((await reset(post({ token: stale, password: 'new-password-1' }))).status).toBe(400);
    expect((await reset(post({ token: 'garbage', password: 'new-password-1' }))).status).toBe(400);
    expect((await reset(post({ token: stale, password: 'short' }))).status).toBe(400);
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
