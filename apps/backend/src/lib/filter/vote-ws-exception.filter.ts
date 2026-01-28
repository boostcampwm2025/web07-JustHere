import { Catch, ArgumentsHost } from '@nestjs/common'
import { BaseWsExceptionFilter } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

type VoteErrorPayload = {
  code: string
  message: string
  actionId?: string
}

@Catch()
export class VoteWebsocketExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>()
    const data = host.switchToWs().getData<unknown>()

    let code: string = ErrorType.InternalServerError
    let message = 'Internal server error'

    if (exception instanceof CustomException) {
      code = exception.type
      message = exception.message
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const payload: VoteErrorPayload = { code, message }

    if (data && typeof data === 'object' && 'actionId' in data) {
      const actionId = (data as { actionId?: unknown }).actionId
      if (typeof actionId === 'string') {
        payload.actionId = actionId
      }
    }

    client.emit('vote:error', payload)
  }
}
