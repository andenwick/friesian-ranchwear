import { SITE_NAME, SITE_URL } from '@/lib/site';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = `${SITE_NAME} <orders@friesianranchwear.com>`;

/** Base URL for links in emails. Uses NEXTAUTH_URL so local runs link to localhost. */
export function emailLinkBase() {
  const configured = process.env.NEXTAUTH_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/+$/, '');
  return SITE_URL;
}

export function emailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends one transactional email through Resend.
 *
 * Never throws. Returns { sent: true, id } on success, { skipped: true } when email
 * is not configured, or { sent: false, code } on failure. Recipients and contents are
 * never logged.
 *
 * `idempotencyKey` makes Resend drop a repeat of the same send for 24 hours, so a
 * retried webhook or double click cannot email the customer twice.
 */
export async function sendEmail({ to, subject, html, text, idempotencyKey }, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true };
  if (typeof to !== 'string' || !to.includes('@')) return { sent: false, code: 'INVALID_RECIPIENT' };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const body = {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: [to],
    subject,
    html,
    text,
  };
  if (process.env.EMAIL_REPLY_TO) body.reply_to = process.env.EMAIL_REPLY_TO;

  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error(JSON.stringify({ event: 'email_send_failed', code: `HTTP_${response.status}`, subject }));
      return { sent: false, code: `HTTP_${response.status}` };
    }
    const data = await response.json().catch(() => ({}));
    return { sent: true, id: data.id || null };
  } catch (error) {
    const code = error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    console.error(JSON.stringify({ event: 'email_send_failed', code, subject }));
    return { sent: false, code };
  }
}
