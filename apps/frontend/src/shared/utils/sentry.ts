import * as Sentry from '@sentry/react'

type BreadcrumbLevel = 'info' | 'warning' | 'error'

export function initSentry(options: { dsn: string; environment: string; release?: string }) {
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url)
          url.search = ''
          event.request.url = url.toString()
        } catch {
          // ignore invalid URL parsing
        }
      }
      return event
    },
  })
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>, level: BreadcrumbLevel = 'info') {
  Sentry.addBreadcrumb({ category, message, data, level })
}

export function addSocketBreadcrumb(message: string, data?: Record<string, unknown>, level: BreadcrumbLevel = 'info') {
  addBreadcrumb('socket', message, data, level)
}

export function captureError(error: Error, tags?: Record<string, string>, extra?: Record<string, unknown>) {
  Sentry.captureException(error, { tags, extra })
}
