import { SITE_NAME } from '@/lib/site';

// Inline styles only: most mail clients drop <style> blocks and web fonts.
const COLORS = {
  black: '#0C0C0C',
  charcoal: '#1A1816',
  muted: '#6B5F53',
  line: '#E6E0D8',
  brass: '#8B7355',
  page: '#FAF8F5',
  parchment: '#F2EDE8',
};
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const BODY = "Barlow,'Helvetica Neue',Arial,sans-serif";
const INSTAGRAM_URL = 'https://instagram.com/friesianranchwear';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

export function orderNumber(orderId) {
  return String(orderId).slice(-8).toUpperCase();
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:${COLORS.brass}">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${BODY};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function layout({ preheader, heading, bodyHtml }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.line}">
<tr><td style="background:${COLORS.black};padding:22px 32px;font-family:${DISPLAY};font-size:20px;font-weight:600;letter-spacing:4px;color:${COLORS.parchment}">FRIESIAN RANCHWEAR</td></tr>
<tr><td style="padding:32px;font-family:${BODY};font-size:15px;line-height:1.6;color:${COLORS.charcoal}">
<h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:28px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${COLORS.charcoal}">${escapeHtml(heading)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${COLORS.line};font-family:${BODY};font-size:12px;line-height:1.6;color:${COLORS.muted}">
Questions? Reply to this email or DM us on <a href="${INSTAGRAM_URL}" style="color:${COLORS.brass}">Instagram</a>.<br>${SITE_NAME} &middot; Salt Lake City, Utah
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function textFooter() {
  return `\n\nQuestions? Reply to this email or DM us on Instagram: ${INSTAGRAM_URL}\n${SITE_NAME}, Salt Lake City, Utah`;
}

function itemLabel(item) {
  const options = [item.size, item.color].filter(Boolean).join(' / ');
  return options ? `${item.productName} (${options})` : item.productName;
}

function itemsTable(order) {
  const rows = order.items.map((item) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${COLORS.line}">${escapeHtml(itemLabel(item))}<br><span style="color:${COLORS.muted};font-size:13px">Qty ${Number(item.quantity)}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};white-space:nowrap">${formatMoney(Number(item.unitPrice) * Number(item.quantity))}</td>
</tr>`).join('');
  const total = (label, value, strong = false) => `<tr>
<td style="padding:6px 0;${strong ? 'font-weight:600;' : `color:${COLORS.muted};`}">${label}</td>
<td align="right" style="padding:6px 0;${strong ? 'font-weight:600;' : ''}">${formatMoney(value)}</td>
</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;font-family:${BODY};font-size:14px">
${rows}
${total('Subtotal', order.subtotal)}
${total('Shipping', order.shipping)}
${total('Tax', order.tax)}
${total('Total', order.total, true)}
</table>`;
}

function itemsText(order) {
  const lines = order.items.map((item) => `- ${itemLabel(item)} x${Number(item.quantity)}: ${formatMoney(Number(item.unitPrice) * Number(item.quantity))}`);
  return [
    ...lines,
    '',
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Shipping: ${formatMoney(order.shipping)}`,
    `Tax: ${formatMoney(order.tax)}`,
    `Total: ${formatMoney(order.total)}`,
  ].join('\n');
}

function addressLines(order) {
  return [
    order.shippingName,
    order.shippingStreet,
    order.shippingStreet2,
    [order.shippingCity, [order.shippingState, order.shippingZip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
  ].filter(Boolean);
}

export function orderConfirmationEmail(order, { linkBase }) {
  const number = orderNumber(order.id);
  const address = addressLines(order);
  const ordersLink = order.userId ? `${linkBase}/account/orders` : null;
  const bodyHtml = `<p style="margin:0 0 8px">Thanks for your order. We're getting it ready and will email you when it ships.</p>
<p style="margin:0 0 16px;color:${COLORS.muted}">Order #${escapeHtml(number)}</p>
${itemsTable(order)}
${address.length ? `<p style="margin:24px 0 4px;font-family:${DISPLAY};font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase">Shipping to</p>
<p style="margin:0">${address.map(escapeHtml).join('<br>')}</p>` : ''}
${ordersLink ? button(ordersLink, 'View your orders') : '<p style="margin:24px 0 0;color:' + COLORS.muted + '">Keep this email as your receipt.</p>'}`;

  const text = [
    `Thanks for your order. We're getting it ready and will email you when it ships.`,
    `Order #${number}`,
    '',
    itemsText(order),
    ...(address.length ? ['', 'Shipping to:', ...address] : []),
    '',
    ordersLink ? `View your orders: ${ordersLink}` : 'Keep this email as your receipt.',
  ].join('\n') + textFooter();

  return {
    subject: `Order #${number} confirmed`,
    html: layout({ preheader: `Order #${number} is confirmed.`, heading: 'Order confirmed', bodyHtml }),
    text,
  };
}

export function orderShippedEmail(order, { linkBase }) {
  const number = orderNumber(order.id);
  const address = addressLines(order);
  const ordersLink = order.userId ? `${linkBase}/account/orders` : null;
  const bodyHtml = `<p style="margin:0 0 8px">Your order is on the way.</p>
<p style="margin:0 0 16px;color:${COLORS.muted}">Order #${escapeHtml(number)}</p>
${itemsTable(order)}
${address.length ? `<p style="margin:24px 0 4px;font-family:${DISPLAY};font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase">Shipping to</p>
<p style="margin:0">${address.map(escapeHtml).join('<br>')}</p>` : ''}
${ordersLink ? button(ordersLink, 'View your orders') : ''}`;

  const text = [
    'Your order is on the way.',
    `Order #${number}`,
    '',
    itemsText(order),
    ...(address.length ? ['', 'Shipping to:', ...address] : []),
    ...(ordersLink ? ['', `View your orders: ${ordersLink}`] : []),
  ].join('\n') + textFooter();

  return {
    subject: `Order #${number} has shipped`,
    html: layout({ preheader: `Order #${number} is on the way.`, heading: 'Your order shipped', bodyHtml }),
    text,
  };
}

export function passwordResetEmail({ resetUrl, minutes }) {
  const bodyHtml = `<p style="margin:0 0 8px">Someone asked to reset the password for this email address. If that was you, choose a new password below.</p>
${button(resetUrl, 'Reset password')}
<p style="margin:16px 0 0;color:${COLORS.muted};font-size:13px">This link works once and expires in ${Number(minutes)} minutes. If you didn't ask for this, you can ignore this email; your password won't change.</p>`;

  const text = [
    'Someone asked to reset the password for this email address. If that was you, choose a new password here:',
    resetUrl,
    '',
    `This link works once and expires in ${Number(minutes)} minutes. If you didn't ask for this, ignore this email; your password won't change.`,
  ].join('\n') + textFooter();

  return {
    subject: 'Reset your password',
    html: layout({ preheader: 'Choose a new password.', heading: 'Reset your password', bodyHtml }),
    text,
  };
}

export function orderLookupEmail(orders, { linkBase, hasAccount }) {
  const rows = orders.map((order) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${COLORS.line}">Order #${escapeHtml(orderNumber(order.id))}<br><span style="color:${COLORS.muted};font-size:13px">${escapeHtml(order.createdAt.toISOString().slice(0, 10))} &middot; ${escapeHtml(order.status.charAt(0) + order.status.slice(1).toLowerCase())}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};white-space:nowrap">${formatMoney(order.total)}</td>
</tr>`).join('');
  const ordersLink = `${linkBase}/account/orders`;
  const bodyHtml = `<p style="margin:0 0 16px">Here are the orders placed with this email address.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${BODY};font-size:14px">${rows}</table>
${hasAccount ? button(ordersLink, 'Sign in to see details') : ''}`;

  const text = [
    'Here are the orders placed with this email address.',
    '',
    ...orders.map((order) => `Order #${orderNumber(order.id)} (${order.createdAt.toISOString().slice(0, 10)}, ${order.status.toLowerCase()}): ${formatMoney(order.total)}`),
    ...(hasAccount ? ['', `Sign in to see details: ${ordersLink}`] : []),
  ].join('\n') + textFooter();

  return {
    subject: 'Your Friesian Ranchwear orders',
    html: layout({ preheader: 'Your order history.', heading: 'Your orders', bodyHtml }),
    text,
  };
}
