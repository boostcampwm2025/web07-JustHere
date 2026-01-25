import type { SocketErrorType } from '@/shared/types'

/**
 * 클라이언트 소켓 에러 타입 클래스
 */
class SocketError extends Error {
  readonly errorType: SocketErrorType

  constructor(errorType: SocketErrorType, message: string) {
    super(message)
    this.name = 'SocketError'
    this.errorType = errorType
  }
}

export class RoomNotFoundError extends SocketError {
  constructor(message: string = '존재하지 않거나 삭제된 방입니다.') {
    super('NOT_FOUND', message)
    this.name = 'RoomNotFoundError'
  }
}
