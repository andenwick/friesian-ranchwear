export function normalizeSubscriberEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function hasSubscriberEmail(rows, email) {
  const normalizedEmail = normalizeSubscriberEmail(email);
  return rows.some((row) => normalizeSubscriberEmail(row?.[0]) === normalizedEmail);
}
