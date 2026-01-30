import { ResponseBuilderInterceptor } from './response-builder.interceptor'
import { ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common'
import { of } from 'rxjs'
import { ResponseStatus } from '@/lib/types/response.type'
import { Request, Response } from 'express'

describe('ResponseBuilderInterceptor', () => {
  let interceptor: ResponseBuilderInterceptor<any>
  let mockExecutionContext: ExecutionContext
  let mockCallHandler: CallHandler
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    interceptor = new ResponseBuilderInterceptor()
    mockRequest = {
      originalUrl: '/test',
    }
    mockResponse = {
      statusCode: 200,
    }
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('data')),
    }
  })

  it('인터셉터가 정의되어 있어야 한다', () => {
    expect(interceptor).toBeDefined()
  })

  describe('HTTP 요청 처리', () => {
    beforeEach(() => {
      mockExecutionContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext
    })

    it('응답을 표준 포맷으로 변환해야 한다', done => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(
            expect.objectContaining({
              status: ResponseStatus.Success,
              statusCode: 200,
              data: 'data',
              // unsafe-assignment 해결: 타입을 명시적으로 변환
              timestamp: expect.any(String) as unknown as string,
            }),
          )
          done()
        },
      })
    })

    it('/metrics 요청은 변환하지 않고 그대로 반환해야 한다', done => {
      mockRequest.originalUrl = '/metrics'
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toBe('data')
          done()
        },
      })
    })

    it('StreamableFile은 변환하지 않고 그대로 반환해야 한다', done => {
      const streamableFile = new StreamableFile(Buffer.from('file'))
      mockCallHandler.handle = jest.fn().mockReturnValue(of(streamableFile))

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toBe(streamableFile)
          done()
        },
      })
    })
  })

  describe('WebSocket 요청 처리', () => {
    beforeEach(() => {
      mockExecutionContext = {
        getType: jest.fn().mockReturnValue('ws'),
      } as unknown as ExecutionContext
    })

    it('응답을 표준 포맷으로 변환해야 한다', done => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(
            expect.objectContaining({
              status: ResponseStatus.Success,
              statusCode: 200,
              data: 'data',
              timestamp: expect.any(String) as unknown as string,
            }),
          )
          done()
        },
      })
    })
  })

  describe('기타 요청 처리', () => {
    beforeEach(() => {
      mockExecutionContext = {
        getType: jest.fn().mockReturnValue('rpc'),
      } as unknown as ExecutionContext
    })

    it('응답을 표준 포맷으로 변환해야 한다', done => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(
            expect.objectContaining({
              status: ResponseStatus.Success,
              statusCode: 200,
              data: 'data',
              timestamp: expect.any(String) as unknown as string,
            }),
          )
          done()
        },
      })
    })
  })
})
