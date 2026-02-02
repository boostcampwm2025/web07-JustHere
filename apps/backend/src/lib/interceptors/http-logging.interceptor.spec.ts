import { HttpLoggingInterceptor } from './http-logging.interceptor'
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { of } from 'rxjs'
import { Request, Response } from 'express'

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor
  let mockExecutionContext: ExecutionContext
  let mockCallHandler: CallHandler
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let loggerLogSpy: jest.SpyInstance

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor()
    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    }
    mockResponse = {
      statusCode: 200,
    }

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('response')),
    }

    // Logger Mocking
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('인터셉터가 정의되어 있어야 한다', () => {
    expect(interceptor).toBeDefined()
  })

  it('요청 시작과 종료 시 로그를 출력해야 한다', done => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).toHaveBeenCalledTimes(2)
        expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Request Start: GET /test - IP: 127.0.0.1'))
        expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('[GET] /test 200'))
        done()
      },
    })
  })

  it('/metrics 경로는 로깅하지 않아야 한다', done => {
    mockRequest.originalUrl = '/metrics'
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).not.toHaveBeenCalled()
        done()
      },
    })
  })

  it('User-Agent가 없는 경우 빈 문자열로 처리해야 한다', done => {
    ;(mockRequest.get as jest.Mock).mockReturnValue(undefined)
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('UA: '))
        done()
      },
    })
  })
})
