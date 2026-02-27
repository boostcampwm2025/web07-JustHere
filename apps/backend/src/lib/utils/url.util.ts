import type { Request } from 'express'

export const appendQueryString = (url: string, req: Request): string => {
  const queryIndex = req.originalUrl.indexOf('?')
  if (queryIndex < 0) return url
  const queryString = req.originalUrl.slice(queryIndex + 1)
  if (!queryString) return url
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}
