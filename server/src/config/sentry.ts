import * as Sentry from '@sentry/node';
import { env } from './env';

/**
 * Initializes Sentry for error and performance monitoring if SENTRY_DSN is configured.
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  // eslint-disable-next-line no-console
  console.log(`🛡️  Sentry initialized in ${env.NODE_ENV} mode.`);
}

export { Sentry };
