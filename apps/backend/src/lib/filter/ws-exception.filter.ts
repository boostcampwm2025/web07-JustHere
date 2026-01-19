import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType, ResponseStatus, ErrorStatusMap } from '@/lib/types/response.type'
import { Catch, ArgumentsHost } from '@nestjs/common'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch()
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>()
    const data = host.switchToWs().getData()

    let errorType = ErrorType.InternalServerError
    let message = 'Internal server error'
    let statusCode = 400

    // 커스텀 예외 처리
    if (exception instanceof CustomException) {
      errorType = exception.type
      message = exception.message
      statusCode = ErrorStatusMap[exception.type] || 400
    }
    // 일반 에러 처리
    else if (exception instanceof Error) {
      message = exception.message
    }

    // 클라이언트에게 전송할 표준 에러 포맷
    client.emit('error', {
      status: ResponseStatus.Error,
      statusCode,
      errorType,
      message,
      data,
      timestamp: new Date().toISOString(),
    })
  }
}
