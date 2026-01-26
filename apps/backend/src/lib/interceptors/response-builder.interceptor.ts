import { ResponseStatus } from '@/lib/types/response.type'
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request, Response } from 'express'
import { map } from 'rxjs/operators'

export interface ResponseType<T> {
  status: ResponseStatus
  statusCode: number
  data: T
  timestamp: string
}

@Injectable()
export class ResponseBuilderInterceptor<T> implements NestInterceptor<T, ResponseType<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const request: Request = context.switchToHttp().getRequest()

    if (request.url === '/metrics') {
      return next.handle()
    }

    const now = new Date().toISOString()

    // 1. HTTP 요청 처리
    if (context.getType() === 'http') {
      const ctx = context.switchToHttp()
      const response = ctx.getResponse<Response>()

      return next.handle().pipe(
        map(data => ({
          status: ResponseStatus.Success,
          statusCode: response.statusCode,
          data,
          timestamp: now,
        })),
      )
    }

    // 2. WebSocket 요청 처리
    else if (context.getType() === 'ws') {
      return next.handle().pipe(
        map(data => ({
          status: ResponseStatus.Success,
          statusCode: 200,
          data,
          timestamp: now,
        })),
      )
    }

    // 3. 그 외 처리
    return next.handle().pipe(
      map(data => ({
        status: ResponseStatus.Success,
        statusCode: 200,
        data,
        timestamp: now,
      })),
    )
  }
}
