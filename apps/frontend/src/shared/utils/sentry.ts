import * as Sentry from '@sentry/react'

type BreadcrumbLevel = 'info' | 'warning' | 'error'

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>, level: BreadcrumbLevel = 'info') {
  Sentry.addBreadcrumb({ category, message, data, level })
}

export function addSocketBreadcrumb(message: string, data?: Record<string, unknown>, level: BreadcrumbLevel = 'info') {
  addBreadcrumb('socket', message, data, level)
}

export function captureError(error: Error, tags?: Record<string, string>, extra?: Record<string, unknown>) {
  Sentry.captureException(error, { tags, extra })
}
