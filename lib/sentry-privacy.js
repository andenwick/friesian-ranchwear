const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'idempotency-key',
  'set-cookie',
  'x-order-access-key',
]);

const SENSITIVE_QUERY_KEYS = new Set([
  'client_secret',
  'payment_intent_client_secret',
]);

function scrubUrl(value) {
  if (typeof value !== 'string') return value;
  return value.replace(
    /([?&](?:client_secret|payment_intent_client_secret)=)[^&#\s]*/gi,
    '$1[Filtered]'
  );
}

function scrubBreadcrumb(breadcrumb) {
  if (!breadcrumb) return breadcrumb;
  const clean = { ...breadcrumb, message: scrubUrl(breadcrumb.message) };
  if (breadcrumb.data) {
    clean.data = Object.fromEntries(
      Object.entries(breadcrumb.data).flatMap(([key, value]) => {
        const normalized = key.toLowerCase();
        if (SENSITIVE_HEADERS.has(normalized)) return [];
        if (SENSITIVE_QUERY_KEYS.has(normalized)) return [[key, '[Filtered]']];
        return [[key, scrubUrl(value)]];
      })
    );
  }
  return clean;
}

export function scrubTelemetryEvent(event) {
  if (!event) return event;

  if (event.request?.headers) {
    event.request.headers = Object.fromEntries(
      Object.entries(event.request.headers).flatMap(([key, value]) => {
        const normalized = key.toLowerCase();
        if (SENSITIVE_HEADERS.has(normalized)) return [];
        if (normalized === 'referer' || normalized === 'referrer') {
          return [[key, scrubUrl(value)]];
        }
        return [[key, value]];
      })
    );
  }
  // Request bodies can contain checkout identity and shipping data. Operational
  // telemetry does not need them.
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
  }

  if (event.request?.url) {
    try {
      const url = new URL(event.request.url, 'http://telemetry.invalid');
      for (const key of SENSITIVE_QUERY_KEYS) url.searchParams.delete(key);
      event.request.url = event.request.url.startsWith('http')
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`;
    } catch {
      event.request.url = scrubUrl(event.request.url);
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }

  return event;
}
