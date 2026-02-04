export type ApiErrorType =
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'BAD_GATEWAY'
  | 'CATEGORY_OVERFLOW_EXCEPTION'
  | 'NOT_OWNER'
  | 'TARGET_NOT_FOUND'
  | 'NOT_IN_ROOM'
  | 'VOTE_ALREADY_STARTED'
  | 'VOTE_NOT_IN_PROGRESS'
  | 'DUPLICATED_CANDIDATE'
  | 'NO_CANDIDATES'
  | 'VOTE_SINGLE_VOTE_LIMIT'

export interface ApiErrorResponse {
  status: 'ERROR'
  statusCode: number
  errorType: ApiErrorType
  message: string
  data?: unknown
  timestamp: string
}
