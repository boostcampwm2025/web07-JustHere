import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Request, Response } from 'express'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest()
    const { method, originalUrl, ip } = req
    const userAgent = req.get('user-agent') || ''

    const now = Date.now()

    this.logger.log(`Request Start: ${method} ${originalUrl} - IP: ${ip}`)

    return next.handle().pipe(
      tap(() => {
        const res: Response = context.switchToHttp().getResponse()
        const { statusCode } = res
        const delay = Date.now() - now

        // 성공 로그 출력
        this.logger.log(`[${method}] ${originalUrl} ${statusCode} - ${delay}ms - IP: ${ip} - UA: ${userAgent}`)
      }),
    )
  }
}
