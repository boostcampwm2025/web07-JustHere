import { Test, TestingModule } from '@nestjs/testing'
import { YjsService } from './yjs.service'
import { CanvasRepository } from './canvas.repository'
import { Logger } from '@nestjs/common'
import * as Y from 'yjs'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

describe('YjsService', () => {
  let service: YjsService

  // Manual Mock 객체 정의
  let mockRepository: {
    getMergedUpdate: jest.Mock
    saveUpdateLog: jest.Mock
  }

  beforeEach(async () => {
    // 타이머 모킹 설정 (각 테스트마다 초기화)
    jest.useFakeTimers()

    // Mock 구현체 초기화
    mockRepository = {
      getMergedUpdate: jest.fn(),
      saveUpdateLog: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YjsService,
        {
          provide: CanvasRepository,
          useValue: mockRepository, // Manual Mock 주입
        },
      ],
    }).compile()

    service = module.get<YjsService>(YjsService)

    // Logger 모킹
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    // 타이머 정리
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('initializeConnection', () => {
    const roomId = 'room-1'
    const categoryId = 'cat-1'
    const socketId = 'socket-1'

    it('새 문서를 생성하고 초기 업데이트 데이터를 반환해야 한다', async () => {
      // spyOn 대신 mock 객체 직접 제어
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())

      const result = await service.initializeConnection(roomId, categoryId, socketId)

      expect(result.docKey).toBe(`${roomId}-${categoryId}`)
      expect(result.update).toBeDefined()
      expect(mockRepository.getMergedUpdate).toHaveBeenCalledWith(categoryId)
    })

    it('기존 DB 데이터를 불러와 문서를 초기화해야 한다', async () => {
      const doc = new Y.Doc()
      doc.getText('test').insert(0, 'hello')
      const update = Y.encodeStateAsUpdate(doc)

      // YDoc 문서 병합
      mockRepository.getMergedUpdate.mockResolvedValue(update)

      const result = await service.initializeConnection(roomId, categoryId, socketId)

      const clientDoc = new Y.Doc()
      if (result.update) {
        Y.applyUpdate(clientDoc, new Uint8Array(result.update))
      }

      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      expect(clientDoc.getText('test').toString()).toBe('hello')
    })

    it('이미 메모리에 로드된 문서가 있다면 DB 조회 없이 반환해야 한다', async () => {
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())

      // 첫 번째 호출 (DB 조회 발생)
      await service.initializeConnection(roomId, categoryId, socketId)

      // 두 번째 호출 (메모리 캐시 사용)
      await service.initializeConnection(roomId, categoryId, 'socket-2')

      expect(mockRepository.getMergedUpdate).toHaveBeenCalledTimes(1)
    })

    it('DB에서 문서 로드 실패 시 InternalServerError 예외를 던져야 한다', async () => {
      mockRepository.getMergedUpdate.mockRejectedValue(new Error('DB Error'))

      await expect(service.initializeConnection(roomId, categoryId, socketId)).rejects.toThrow(
        new CustomException(ErrorType.InternalServerError, '캔버스 연결 초기화에 실패했습니다.'),
      )
    })
  })

  describe('connectClient', () => {
    it('문서가 존재하지 않으면 클라이언트를 연결하지 않아야 한다', () => {
      // initializeConnection을 호출하지 않고 connectClient 직접 호출
      service.connectClient('non-existent-cat', 'socket-1')

      // 연결되지 않았으므로 disconnect 시 빈 배열 반환
      const disconnected = service.disconnectClient('socket-1')
      expect(disconnected).toEqual([])
    })

    it('이미 연결된 클라이언트가 같은 카테고리에 다시 연결되어도 중복되지 않아야 한다', async () => {
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())
      await service.initializeConnection('room-1', 'cat-1', 'socket-1')

      // 다시 연결 시도
      service.connectClient('cat-1', 'socket-1')

      const disconnected = service.disconnectClient('socket-1')
      expect(disconnected).toHaveLength(1)
      expect(disconnected).toContain('cat-1')
    })
  })

  describe('disconnectClient', () => {
    it('클라이언트 연결을 해제하고 참여 중이던 캔버스 ID 목록을 반환해야 한다', async () => {
      const socketId = 'user-1'
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())

      await service.initializeConnection('room-1', 'cat-1', socketId)
      await service.initializeConnection('room-1', 'cat-2', socketId)

      const result = service.disconnectClient(socketId)

      expect(result).toHaveLength(2)
      expect(result).toContain('cat-1')
      expect(result).toContain('cat-2')
    })

    it('연결되지 않은 클라이언트 해제 시 빈 배열을 반환해야 한다', () => {
      const result = service.disconnectClient('unknown-socket')
      expect(result).toEqual([])
    })
  })

  describe('processUpdate', () => {
    const roomId = 'room-1'
    const categoryId = 'cat-1'
    const socketId = 'socket-1'

    beforeEach(async () => {
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())
      await service.initializeConnection(roomId, categoryId, socketId)
    })

    it('업데이트를 메모리 문서에 적용하고 버퍼에 쌓아야 한다', () => {
      const clientDoc = new Y.Doc()
      clientDoc.getText('content').insert(0, 'A')
      const update = Y.encodeStateAsUpdate(clientDoc)

      expect(() => service.processUpdate(categoryId, update)).not.toThrow()
    })

    it('존재하지 않는 캔버스에 업데이트 시 NotFound 예외를 던져야 한다', () => {
      const update = new Uint8Array([0, 0])
      expect(() => service.processUpdate('invalid-cat', update)).toThrow(
        new CustomException(ErrorType.NotFound, '활성화된 캔버스 세션을 찾을 수 없습니다. 다시 접속해주세요.'),
      )
    })

    it('잘못된 형식의 업데이트 데이터인 경우 BadRequest 예외를 던져야 한다', () => {
      const invalidUpdate = new Uint8Array([1, 2, 3, 4, 5])

      expect(() => service.processUpdate(categoryId, invalidUpdate)).toThrow(
        new CustomException(ErrorType.BadRequest, '잘못된 캔버스 데이터 형식입니다.'),
      )
    })
  })

  describe('Buffer Flush (onModuleInit & onModuleDestroy)', () => {
    const roomId = 'room-1'
    const categoryId = 'cat-1'

    beforeEach(async () => {
      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())
      await service.initializeConnection(roomId, categoryId, 'socket-1')
    })

    it('onModuleInit: 일정 주기로 버퍼 내용을 DB에 저장해야 한다', async () => {
      const doc = new Y.Doc()
      doc.getText('t').insert(0, 'a')
      const update = Y.encodeStateAsUpdate(doc)
      service.processUpdate(categoryId, update)

      // 1. 인터벌 시작
      service.onModuleInit()

      // 2. 시간 앞당기기
      jest.advanceTimersByTime(5000)
      await Promise.resolve() // 마이크로태스크 큐 처리

      expect(mockRepository.saveUpdateLog).toHaveBeenCalledWith(categoryId, expect.any(Uint8Array))
    })

    it('onModuleDestroy: 종료 시 버퍼 내용을 DB에 저장해야 한다', async () => {
      const doc = new Y.Doc()
      doc.getText('t').insert(0, 'b')
      const update = Y.encodeStateAsUpdate(doc)
      service.processUpdate(categoryId, update)

      service.onModuleDestroy()
      await Promise.resolve()

      expect(mockRepository.saveUpdateLog).toHaveBeenCalledWith(categoryId, expect.any(Uint8Array))
    })

    it('버퍼가 비어있으면 DB 저장을 수행하지 않아야 한다', async () => {
      service.onModuleDestroy()
      await Promise.resolve()

      expect(mockRepository.saveUpdateLog).not.toHaveBeenCalled()
    })

    it('DB 저장 실패 시 버퍼를 복구해야 하며, 그 사이 들어온 새 데이터도 보존해야 한다', async () => {
      const doc = new Y.Doc()
      doc.getText('t').insert(0, 'old')
      const oldUpdate = Y.encodeStateAsUpdate(doc)
      service.processUpdate(categoryId, oldUpdate)

      // DB 저장 실패 Mocking
      mockRepository.saveUpdateLog.mockRejectedValueOnce(new Error('DB Save Error'))

      // private method 호출을 위해 any 캐스팅
      const flushPromise = service.flushBufferToDB()

      // Flush 도중 새로운 업데이트 발생 시뮬레이션
      const doc2 = new Y.Doc()
      doc2.getText('t').insert(0, 'new')
      const newUpdate = Y.encodeStateAsUpdate(doc2)
      service.processUpdate(categoryId, newUpdate)

      // Flush 완료 대기
      await flushPromise

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(Logger.prototype.error).toHaveBeenCalled()

      // 버퍼가 복구되었는지 확인 (old + new)
      // 다시 Flush 시도하여 verify
      mockRepository.saveUpdateLog.mockResolvedValueOnce(undefined)
      await service.flushBufferToDB()

      expect(mockRepository.saveUpdateLog).toHaveBeenCalledTimes(2)
    })
  })
})
