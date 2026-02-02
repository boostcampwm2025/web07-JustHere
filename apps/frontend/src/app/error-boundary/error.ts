import type { SocketErrorType } from '@/shared/types'
import { ERROR_TYPE } from './error-type'

/**
 * 클라이언트 소켓 에러 타입 클래스
 */
class SocketError extends Error {
  readonly errorType: SocketErrorType

  constructor(errorType: SocketErrorType, message: string) {
    super(message)
    this.name = 'SOCKET_ERROR'
    this.errorType = errorType
  }
}

/**
 * 방을 찾을 수 없을 때 발생하는 에러
 */
export class RoomNotFoundError extends SocketError {
  constructor(message: string = '존재하지 않거나 삭제된 방입니다.') {
    super('NOT_FOUND', message)
    this.name = ERROR_TYPE.ROOM_NOT_FOUND
  }
}

/**
 * 결과 데이터가 없을 때 발생하는 에러
 */
export class ResultNotFoundError extends Error {
  constructor(message: string = '투표 결과가 없습니다.') {
    super(message)
    this.name = ERROR_TYPE.RESULT_NOT_FOUND
  }
}

/**
 * 결과를 불러오는데 실패했을 때 발생하는 에러
 */
export class ResultLoadFailedError extends Error {
  constructor(message: string = '결과를 불러오는데 실패했습니다.') {
    super(message)
    this.name = ERROR_TYPE.RESULT_LOAD_FAILED
  }
}
