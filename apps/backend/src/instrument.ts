import * as Sentry from '@sentry/nestjs'

const sentryDsn = process.env.SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'local',
    release: process.env.SENTRY_RELEASE,
  })
}
