import * as Sentry from '@sentry/react'
import type { ErrorType as RoomErrorType, ApiErrorType, SocketErrorType } from '@/shared/types'

export type ClientErrorCode =
  | 'CLIENT_UNKNOWN'
  | 'CLIENT_NETWORK_ERROR'
  | 'CLIENT_CLIPBOARD_WRITE_FAILED'
  | 'CLIENT_ROOM_CREATE_FAILED'
  | 'CLIENT_ROOM_UPDATE_FAILED'
  | 'CLIENT_RESET_FAILED'

export type AppErrorCode = ApiErrorType | SocketErrorType | RoomErrorType | ClientErrorCode

type AppErrorSource = 'api' | 'socket' | 'client'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly statusCode?: number
  readonly data?: unknown
  readonly source?: AppErrorSource
  readonly originalError?: unknown

  constructor(params: {
    code: AppErrorCode
    message: string
    statusCode?: number
    data?: unknown
    source?: AppErrorSource
    originalError?: unknown
  }) {
    super(params.message)
    this.name = 'AppError'
    this.code = params.code
    this.statusCode = params.statusCode
    this.data = params.data
    this.source = params.source
    this.originalError = params.originalError
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError

const TOAST_MESSAGES: Partial<Record<AppErrorCode, string>> & { CLIENT_UNKNOWN: string } = {
  CLIENT_UNKNOWN: '잠시 후 다시 시도해주세요.',
  CLIENT_NETWORK_ERROR: '네트워크 연결이 원활하지 않습니다.',
  CLIENT_CLIPBOARD_WRITE_FAILED: '링크 복사에 실패했습니다.',
  CLIENT_ROOM_CREATE_FAILED: '방 생성에 실패했습니다.',
  CLIENT_ROOM_UPDATE_FAILED: '지역 변경에 실패했습니다.',
  CLIENT_RESET_FAILED: '다시 시도 중 문제가 발생했습니다.',
  ROOM_NOT_FOUND: '존재하지 않거나 삭제된 방입니다.',
  RESULT_NOT_FOUND: '투표 결과가 없습니다.',
  RESULT_LOAD_FAILED: '결과를 불러오는데 실패했습니다.',
  UNKNOWN: '잠시 후 다시 시도해주세요.',
}

const ERROR_PAGE_MESSAGES: Partial<Record<AppErrorCode, string>> = {
  ROOM_NOT_FOUND: '존재하지 않거나 삭제된 방입니다.',
  RESULT_NOT_FOUND: '투표를 먼저 진행해주세요.',
  RESULT_LOAD_FAILED: '잠시 후 다시 시도해주세요.',
  UNKNOWN: '잠시 후 다시 시도해주세요.',
}

export function getDefaultErrorMessage(code: AppErrorCode): string {
  return TOAST_MESSAGES[code] ?? TOAST_MESSAGES.CLIENT_UNKNOWN
}

export function getErrorDescription(code: AppErrorCode): string {
  return ERROR_PAGE_MESSAGES[code] ?? getDefaultErrorMessage(code)
}

export function getErrorCode(error: unknown, fallback: AppErrorCode = 'CLIENT_UNKNOWN'): AppErrorCode {
  if (isAppError(error)) return error.code
  return fallback
}

export function resolveErrorMessage(error: unknown, fallbackCode?: AppErrorCode): string {
  if (isAppError(error) && error.message) return error.message
  if (fallbackCode) return getDefaultErrorMessage(fallbackCode)
  return getDefaultErrorMessage('CLIENT_UNKNOWN')
}

export function reportError(params: {
  error?: unknown
  code?: AppErrorCode
  context?: Record<string, unknown>
  level?: 'info' | 'warning' | 'error'
  message?: string
}) {
  const level = params.level ?? 'error'
  const code = params.code ?? getErrorCode(params.error, 'CLIENT_UNKNOWN')
  const message = params.message ?? resolveErrorMessage(params.error, code)

  const error = params.error instanceof Error ? params.error : new Error(message)

  const originalError = isAppError(params.error) ? params.error.originalError : undefined
  const source = isAppError(params.error) ? params.error.source : undefined
  const data = isAppError(params.error) ? params.error.data : undefined

  Sentry.addBreadcrumb({
    category: 'client',
    message: 'client:error',
    level,
    data: {
      code,
      source,
      ...params.context,
    },
  })

  Sentry.captureException(error, {
    tags: { code, source },
    extra: {
      ...params.context,
      data,
      originalError,
    },
  })
}
