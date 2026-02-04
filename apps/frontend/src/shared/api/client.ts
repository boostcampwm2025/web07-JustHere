import axios from 'axios'
import type { ApiErrorResponse } from '@/shared/types'
import { AppError, getDefaultErrorMessage } from '@/shared/utils'

const isApiErrorResponse = (data: unknown): data is ApiErrorResponse => {
  if (!data || typeof data !== 'object') return false
  const target = data as ApiErrorResponse
  return (
    target.status === 'ERROR' && typeof target.errorType === 'string' && typeof target.message === 'string' && typeof target.statusCode === 'number'
  )
}

export const apiClient = axios.create({
  timeout: 10000,
})

apiClient.interceptors.response.use(
  response => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const response = error.response
      const data = response?.data

      if (isApiErrorResponse(data)) {
        return Promise.reject(
          new AppError({
            code: data.errorType,
            message: data.message,
            statusCode: data.statusCode,
            data: data.data,
            source: 'api',
            originalError: error,
          }),
        )
      }

      if (!response) {
        return Promise.reject(
          new AppError({
            code: 'CLIENT_NETWORK_ERROR',
            message: getDefaultErrorMessage('CLIENT_NETWORK_ERROR'),
            source: 'api',
            originalError: error,
          }),
        )
      }

      return Promise.reject(
        new AppError({
          code: 'CLIENT_UNKNOWN',
          message: getDefaultErrorMessage('CLIENT_UNKNOWN'),
          statusCode: response.status,
          source: 'api',
          originalError: error,
        }),
      )
    }

    return Promise.reject(
      new AppError({
        code: 'CLIENT_UNKNOWN',
        message: getDefaultErrorMessage('CLIENT_UNKNOWN'),
        source: 'api',
        originalError: error,
      }),
    )
  },
)
