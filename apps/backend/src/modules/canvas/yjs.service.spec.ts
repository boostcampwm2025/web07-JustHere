import { Test, TestingModule } from '@nestjs/testing'
import { YjsService } from './yjs.service'
import { CanvasRepository } from './canvas.repository'
import { Logger } from '@nestjs/common'
import * as Y from 'yjs'
import { CustomException } from '@/lib/exceptions/custom.exception'

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
      expect(() => service.processUpdate('invalid-cat', update)).toThrow(CustomException)
    })
  })

  describe('Buffer Flush (onModuleInit)', () => {
    it('일정 주기로 버퍼 내용을 DB에 저장해야 한다', async () => {
      const roomId = 'room-1'
      const categoryId = 'cat-1'

      mockRepository.getMergedUpdate.mockResolvedValue(new Uint8Array())
      await service.initializeConnection(roomId, categoryId, 'socket-1')

      const doc = new Y.Doc()
      doc.getText('t').insert(0, 'a')
      const update = Y.encodeStateAsUpdate(doc)
      service.processUpdate(categoryId, update)

      // 1. 인터벌 시작
      service.onModuleInit()

      // 2. 시간 앞당기기
      jest.advanceTimersByTime(5000)

      // 3. 비동기 콜백(DB 저장)이 완료될 때까지 마이크로태스크 큐 비우기
      await Promise.resolve()

      expect(mockRepository.saveUpdateLog).toHaveBeenCalledWith(categoryId, expect.any(Uint8Array))
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
  })
})
