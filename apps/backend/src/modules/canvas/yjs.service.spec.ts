import { Test, TestingModule } from '@nestjs/testing'
import { YjsService } from './yjs.service'
import { PrismaService } from '@/lib/prisma/prisma.service'
import { Logger } from '@nestjs/common'
import * as Y from 'yjs'
import { CustomException } from '@/lib/exceptions/custom.exception'

describe('YjsService', () => {
  let service: YjsService

  // 1. PrismaService의 필요한 메서드만 타입 정의 (Manual Mocking)
  let prisma: {
    categoryUpdateLog: {
      findMany: jest.Mock
      create: jest.Mock
    }
  }

  beforeEach(async () => {
    // 2. 타이머 모킹 설정 (각 테스트마다 초기화)
    jest.useFakeTimers()

    // 3. Mock 구현체 초기화
    prisma = {
      categoryUpdateLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YjsService,
        {
          provide: PrismaService,
          // 4. 타입 호환성을 위해 강제 단언하여 주입
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile()

    service = module.get(YjsService)

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
      prisma.categoryUpdateLog.findMany.mockResolvedValue([])

      const result = await service.initializeConnection(roomId, categoryId, socketId)

      expect(result.docKey).toBe(`${roomId}-${categoryId}`)
      expect(result.update).toBeDefined()

      expect(prisma.categoryUpdateLog.findMany).toHaveBeenCalledWith({
        where: { categoryId },
        orderBy: { createdAt: 'asc' },
      })
    })

    it('기존 DB 데이터를 불러와 문서를 초기화해야 한다', async () => {
      const doc = new Y.Doc()
      doc.getText('test').insert(0, 'hello')
      const update = Y.encodeStateAsUpdate(doc)

      const mockLog = {
        id: 1,
        categoryId,
        updateData: Buffer.from(update),
        createdAt: new Date(),
      }

      prisma.categoryUpdateLog.findMany.mockResolvedValue([mockLog])

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
      prisma.categoryUpdateLog.findMany.mockResolvedValue([])
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

      prisma.categoryUpdateLog.findMany.mockResolvedValue([])
      await service.initializeConnection(roomId, categoryId, 'socket-1')

      const doc = new Y.Doc()
      doc.getText('t').insert(0, 'a')
      const update = Y.encodeStateAsUpdate(doc)
      service.processUpdate(categoryId, update)

      // 1. 인터벌 시작
      service.onModuleInit()

      // 2. 시간 앞당기기
      jest.advanceTimersByTime(5000)

      // 3. ✨ 핵심 수정: 비동기 콜백(DB 저장)이 완료될 때까지 마이크로태스크 큐 비우기
      await Promise.resolve()

      expect(prisma.categoryUpdateLog.create).toHaveBeenCalledWith({
        data: {
          categoryId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          updateData: expect.any(Buffer),
        },
      })
    })
  })

  describe('disconnectClient', () => {
    it('클라이언트 연결을 해제하고 참여 중이던 캔버스 ID 목록을 반환해야 한다', async () => {
      const socketId = 'user-1'
      prisma.categoryUpdateLog.findMany.mockResolvedValue([])

      await service.initializeConnection('room-1', 'cat-1', socketId)
      await service.initializeConnection('room-1', 'cat-2', socketId)

      const result = service.disconnectClient(socketId)

      expect(result).toHaveLength(2)
      expect(result).toContain('cat-1')
      expect(result).toContain('cat-2')
    })
  })
})
