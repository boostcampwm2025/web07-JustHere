import { Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType, ResponseStatus, ErrorStatusMap } from '@/lib/types/response.type'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch()
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
  constructor(private readonly namespace: string = 'error') {
    super()
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>()
    const data = host.switchToWs().getData<unknown>()

    let errorType = ErrorType.InternalServerError
    let message = 'Internal server error'
    let statusCode = 500

    // 커스텀 예외 처리
    if (exception instanceof CustomException) {
      errorType = exception.type
      message = exception.message
      statusCode = ErrorStatusMap[exception.type] || 500
    }

    // ValidationPipe 등 HttpException 처리
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        message = res
      } else {
        const msg = (res as { message: string | string[] }).message
        message = Array.isArray(msg) ? msg.join(', ') : msg
      }

      errorType = ErrorType.BadRequest
    }

    // 일반 에러 처리
    else if (exception instanceof Error) {
      message = exception.message
    }

    const eventName = this.namespace === 'error' ? 'error' : `${this.namespace}:error`

    // 클라이언트에게 전송할 표준 에러 포맷
    client.emit(eventName, {
      status: ResponseStatus.Error,
      statusCode,
      errorType,
      message,
      data,
      timestamp: new Date().toISOString(),
    })
  }
}
