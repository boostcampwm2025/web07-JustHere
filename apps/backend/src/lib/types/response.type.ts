import { HttpStatus } from '@nestjs/common'

export enum ResponseStatus {
  Success = 'SUCCESS',
  Error = 'ERROR',
}

export enum ErrorType {
  // common
  InternalServerError = 'INTERNAL_SERVER_ERROR',
  BadRequest = 'BAD_REQUEST',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',

  // custom
  CategoryOverFlowException = 'CATEGORY_OVERFLOW_EXCEPTION',
}

export const ErrorStatusMap: Record<ErrorType, HttpStatus> = {
  // common
  [ErrorType.InternalServerError]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorType.BadRequest]: HttpStatus.BAD_REQUEST,
  [ErrorType.Unauthorized]: HttpStatus.UNAUTHORIZED,
  [ErrorType.Forbidden]: HttpStatus.FORBIDDEN,
  [ErrorType.NotFound]: HttpStatus.NOT_FOUND,
  [ErrorType.Conflict]: HttpStatus.CONFLICT,

  // custom
  [ErrorType.CategoryOverFlowException]: HttpStatus.CONFLICT,
}

export interface BaseResponse {
  statusCode: number
  timestamp: string
}

/**
 * 성공 응답 객체 타입
 */
export interface SuccessResponse<T = unknown> extends BaseResponse {
  status: ResponseStatus.Success
  data: T
}

/**
 * 에러 응답 객체 타입
 */
export interface ErrorResponse extends BaseResponse {
  status: ResponseStatus.Error
  errorType: ErrorType
  message: string
  data?: unknown // 에러 발생 시 참고할 추가 데이터 (선택)
}

/**
 * API 리턴 타입 유니온
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse
