import { ErrorType } from '../types/response.type'

export class CustomException extends Error {
  public readonly type: ErrorType
  public readonly data?: unknown

  constructor(type: ErrorType, message?: string, data?: unknown) {
    super(message || type) // 메시지가 없으면 타입명을 기본 메시지로 사용
    this.type = type
    this.data = data
    this.name = 'CustomException'
  }
}
