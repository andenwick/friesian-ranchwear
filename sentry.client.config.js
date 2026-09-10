import * as Sentry from '@sentry/nextjs';
import { scrubTelemetryEvent } from './lib/sentry-privacy';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubTelemetryEvent,
  beforeSendTransaction: scrubTelemetryEvent,
  debug: false,
});
