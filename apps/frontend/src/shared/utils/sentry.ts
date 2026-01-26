import * as Sentry from '@sentry/react'

type BreadcrumbLevel = 'info' | 'warning' | 'error'

export function addSocketBreadcrumb(message: string, data?: Record<string, unknown>, level: BreadcrumbLevel = 'info') {
  Sentry.addBreadcrumb({
    category: 'socket',
    message,
    data,
    level,
  })
}
