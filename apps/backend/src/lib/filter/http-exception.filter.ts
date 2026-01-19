import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorResponse, ErrorStatusMap, ErrorType, ResponseStatus } from '@/lib/types/response.type'
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(Error, CustomException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response: Response = ctx.getResponse()
    const request: Request = ctx.getRequest()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let errorType = ErrorType.InternalServerError
    let message = 'Internal server error'

    // 1. 커스텀 에러 처리
    if (exception instanceof CustomException) {
      status = ErrorStatusMap[exception.type] || HttpStatus.INTERNAL_SERVER_ERROR
      errorType = exception.type
      message = exception.message
    }
    // 2. NestJS 내장 HttpException인 경우 (ValidationPipe 등)
    else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message
      errorType = ErrorType.BadRequest
    } else {
      message = exception.message
    }

    if (!request.url.includes('favicon.ico')) {
      const errorLog = {
        status,
        errorType,
        message,
      }
      this.logger.error(`[${request.method}] ${request.url} ${status} - Error: ${JSON.stringify(errorLog)}`, exception.stack)
    }

    // 클라이언트에게 보낼 응답
    const responseBody: ErrorResponse = {
      status: ResponseStatus.Error,
      statusCode: status,
      errorType,
      message,
      timestamp: new Date().toISOString(),
    }

    response.status(status).json(responseBody)
  }
}
