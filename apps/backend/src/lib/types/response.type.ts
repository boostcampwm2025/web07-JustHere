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
  TooManyRequests = 'TOO_MANY_REQUESTS',
  BadGateway = 'BAD_GATEWAY',

  // custom
  CategoryOverFlowException = 'CATEGORY_OVERFLOW_EXCEPTION',
  NotOwner = 'NOT_OWNER',
  TargetNotFound = 'TARGET_NOT_FOUND',
  NotInRoom = 'NOT_IN_ROOM',
  VoteAlreadyStarted = 'VOTE_ALREADY_STARTED',
  VoteNotInProgress = 'VOTE_NOT_IN_PROGRESS',
  DuplicatedCandidate = 'DUPLICATE_CANDIDATE',
  NoCandidates = 'NO_CANDIDATES',
}

export const ErrorStatusMap: Record<ErrorType, HttpStatus> = {
  // common
  [ErrorType.InternalServerError]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorType.BadRequest]: HttpStatus.BAD_REQUEST,
  [ErrorType.Unauthorized]: HttpStatus.UNAUTHORIZED,
  [ErrorType.Forbidden]: HttpStatus.FORBIDDEN,
  [ErrorType.NotFound]: HttpStatus.NOT_FOUND,
  [ErrorType.Conflict]: HttpStatus.CONFLICT,
  [ErrorType.TooManyRequests]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorType.BadGateway]: HttpStatus.BAD_GATEWAY,

  // custom
  [ErrorType.CategoryOverFlowException]: HttpStatus.BAD_REQUEST,
  [ErrorType.NotOwner]: HttpStatus.FORBIDDEN,
  [ErrorType.TargetNotFound]: HttpStatus.NOT_FOUND,
  [ErrorType.NotInRoom]: HttpStatus.UNAUTHORIZED,
  [ErrorType.VoteAlreadyStarted]: HttpStatus.BAD_REQUEST,
  [ErrorType.DuplicatedCandidate]: HttpStatus.BAD_REQUEST,
  [ErrorType.VoteNotInProgress]: HttpStatus.BAD_REQUEST,
  [ErrorType.NoCandidates]: HttpStatus.BAD_REQUEST,
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
