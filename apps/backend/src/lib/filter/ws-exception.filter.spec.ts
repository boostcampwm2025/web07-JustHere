import { WebsocketExceptionsFilter } from './ws-exception.filter'
import { ArgumentsHost } from '@nestjs/common'
import { CustomException } from '../exceptions/custom.exception'
import { ErrorType, ResponseStatus } from '../types/response.type'
import { Socket } from 'socket.io'

describe('WebsocketExceptionsFilter', () => {
  let filter: WebsocketExceptionsFilter
  let mockArgumentsHost: ArgumentsHost
  let mockClient: Socket
  let mockEmit: jest.Mock

  beforeEach(() => {
    filter = new WebsocketExceptionsFilter()
    mockEmit = jest.fn()
    mockClient = { emit: mockEmit } as unknown as Socket

    mockArgumentsHost = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
        getData: jest.fn().mockReturnValue({ some: 'data' }),
      }),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    }
  })

  it('필터가 정의되어 있어야 한다', () => {
    expect(filter).toBeDefined()
  })

  describe('catch', () => {
    it('CustomException을 처리하고 올바른 에러 응답을 전송해야 한다', () => {
      const exception = new CustomException(ErrorType.BadRequest, '잘못된 요청입니다.')
      filter.catch(exception, mockArgumentsHost)

      expect(mockEmit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          status: ResponseStatus.Error,
          statusCode: 400,
          errorType: ErrorType.BadRequest,
          message: '잘못된 요청입니다.',
          data: { some: 'data' },
        }),
      )
    })

    it('일반 Error를 처리하고 500 에러 응답을 전송해야 한다', () => {
      const exception = new Error('알 수 없는 오류')
      filter.catch(exception, mockArgumentsHost)

      expect(mockEmit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          status: ResponseStatus.Error,
          statusCode: 500,
          errorType: ErrorType.InternalServerError,
          message: '알 수 없는 오류',
          data: { some: 'data' },
        }),
      )
    })

    it('Error 객체가 아닌 예외(예: 문자열)를 처리하고 기본 500 에러를 전송해야 한다', () => {
      const exception = 'String Error'
      filter.catch(exception, mockArgumentsHost)

      expect(mockEmit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          status: ResponseStatus.Error,
          statusCode: 500,
          errorType: ErrorType.InternalServerError,
          message: 'Internal server error', // 기본 메시지
          data: { some: 'data' },
        }),
      )
    })

    it('ErrorStatusMap에 없는 CustomException 타입은 500으로 처리해야 한다', () => {
      // ErrorStatusMap에 없는 가상의 타입을 가진 CustomException
      const exception = new CustomException('UNKNOWN_TYPE' as ErrorType, '알 수 없는 타입')
      filter.catch(exception, mockArgumentsHost)

      expect(mockEmit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          statusCode: 500,
          errorType: 'UNKNOWN_TYPE',
          message: '알 수 없는 타입',
        }),
      )
    })

    it('생성자에서 지정한 네임스페이스로 이벤트를 전송해야 한다', () => {
      const customFilter = new WebsocketExceptionsFilter('custom')
      const exception = new CustomException(ErrorType.NotFound, '찾을 수 없음')
      customFilter.catch(exception, mockArgumentsHost)

      expect(mockEmit).toHaveBeenCalledWith(
        'custom:error',
        expect.objectContaining({
          errorType: ErrorType.NotFound,
        }),
      )
    })
  })
})
