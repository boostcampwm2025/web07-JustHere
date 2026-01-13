import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response: Response = ctx.getResponse()
    const request: Request = ctx.getRequest()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const errorResponse = exception instanceof HttpException ? exception.getResponse() : { message: (exception as Error).message }

    if (!request.url.includes('favicon.ico')) {
      // 로그 포맷팅
      const log = {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.ip,
        message: errorResponse,
        stack: exception instanceof Error ? exception.stack : null,
      }

      // 에러 로그 출력 (스택 트레이스 포함)
      this.logger.error(`[${request.method}] ${request.url} ${status} - Error: ${JSON.stringify(errorResponse)}`, log.stack)
    }

    // 클라이언트에게 보낼 응답
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof errorResponse === 'string' ? errorResponse : errorResponse,
    })
  }
}
