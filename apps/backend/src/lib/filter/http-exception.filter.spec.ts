import { HttpExceptionFilter } from './http-exception.filter'
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { CustomException } from '../exceptions/custom.exception'
import { ErrorType, ResponseStatus } from '../types/response.type'
import * as Sentry from '@sentry/nestjs'

// Sentry 모킹
jest.mock('@sentry/nestjs', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const original = jest.requireActual('@sentry/nestjs')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...original,
    captureException: jest.fn(),
    withScope: jest.fn((callback: (scope: { setTag: jest.Mock; setExtra: jest.Mock }) => void) => {
      const scope = { setTag: jest.fn(), setExtra: jest.fn() }
      callback(scope)
    }),
  }
})

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter
  let mockArgumentsHost: ArgumentsHost
  let mockGetResponse: jest.Mock
  let mockGetRequest: jest.Mock
  let mockStatus: jest.Mock
  let mockJson: jest.Mock
  let loggerErrorSpy: jest.SpyInstance

  // 원래 환경 변수 백업
  const originalEnv = process.env

  beforeEach(() => {
    // 환경 변수 복사 및 SENTRY_DSN 설정
    process.env = { ...originalEnv, SENTRY_DSN: 'mock-dsn' }

    filter = new HttpExceptionFilter()
    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus })
    mockGetRequest = jest.fn().mockReturnValue({ url: '/test', method: 'GET', path: '/test' })

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
      switchToWs: jest.fn(),
      switchToRpc: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    }

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    ;(Sentry.captureException as jest.Mock).mockClear()
    ;(Sentry.withScope as jest.Mock).mockClear()
  })

  afterEach(() => {
    // 환경 변수 원복 및 Mock 초기화
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it('필터가 정의되어 있어야 한다', () => {
    expect(filter).toBeDefined()
  })

  describe('CustomException 처리', () => {
    it('CustomException을 올바르게 처리해야 한다', () => {
      const exception = new CustomException(ErrorType.NotFound, '리소스를 찾을 수 없습니다.')
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          errorType: ErrorType.NotFound,
          message: '리소스를 찾을 수 없습니다.',
          status: ResponseStatus.Error,
        }),
      )
      // 404 에러이므로 Sentry 전송 안 함 (status < 500)
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })

  describe('HttpException 처리', () => {
    it('문자열 응답을 가진 HttpException을 처리해야 한다', () => {
      const exception = new HttpException('잘못된 요청입니다.', HttpStatus.BAD_REQUEST)
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorType: ErrorType.BadRequest,
          message: '잘못된 요청입니다.',
        }),
      )
    })

    it('객체 응답을 가진 HttpException(ValidationPipe)을 처리해야 한다', () => {
      const exception = new HttpException({ message: ['email must be an email', 'password is too short'] }, HttpStatus.BAD_REQUEST)
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorType: ErrorType.BadRequest,
          message: 'email must be an email, password is too short',
        }),
      )
    })
  })

  describe('일반 Error 처리', () => {
    it('일반 Error를 500 Internal Server Error로 처리해야 한다', () => {
      const exception = new Error('예상치 못한 오류')
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorType: ErrorType.InternalServerError,
          message: '예상치 못한 오류',
        }),
      )
      // SENTRY_DSN이 설정되었으므로 호출되어야 함
      expect(Sentry.withScope).toHaveBeenCalled()
      expect(Sentry.captureException).toHaveBeenCalledWith(exception)
    })
  })

  describe('로깅 및 Sentry', () => {
    it('favicon.ico 요청에 대한 에러는 로깅하지 않아야 한다', () => {
      mockGetRequest.mockReturnValue({ url: '/favicon.ico', method: 'GET' })
      const exception = new Error('favicon error')
      filter.catch(exception, mockArgumentsHost)

      expect(loggerErrorSpy).not.toHaveBeenCalled()
    })

    it('500 이상의 서버 에러는 Sentry로 전송해야 한다', () => {
      // process.env.SENTRY_DSN은 beforeEach에서 이미 설정됨
      const exception = new Error('서버 오류')
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(Sentry.withScope).toHaveBeenCalled()
      expect(Sentry.captureException).toHaveBeenCalledWith(exception)
    })

    it('500 미만의 클라이언트 에러는 Sentry로 전송하지 않아야 한다', () => {
      const exception = new CustomException(ErrorType.BadRequest, '잘못된 요청')
      filter.catch(exception, mockArgumentsHost)

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('SENTRY_DSN이 없으면 Sentry로 전송하지 않아야 한다', () => {
      delete process.env.SENTRY_DSN // DSN 제거
      const exception = new Error('서버 오류')
      filter.catch(exception, mockArgumentsHost)

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })
})
