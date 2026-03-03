import { Test, TestingModule } from '@nestjs/testing'
import { CanvasRepository } from './canvas.repository'
import { PrismaService } from '@/lib/prisma/prisma.service'
import * as Y from 'yjs'

describe('CanvasRepository', () => {
  let repository: CanvasRepository

  // Manual Mock 객체 정의
  let mockPrisma: {
    categoryUpdateLog: {
      findMany: jest.Mock
      create: jest.Mock
    }
  }

  beforeEach(async () => {
    // Mock 구현
    mockPrisma = {
      categoryUpdateLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanvasRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma, // Manual Mock 주입
        },
      ],
    }).compile()

    repository = module.get<CanvasRepository>(CanvasRepository)
  })

  describe('getMergedUpdate', () => {
    it('로그가 없으면 빈 Uint8Array를 반환해야 한다', async () => {
      mockPrisma.categoryUpdateLog.findMany.mockResolvedValue([])

      const result = await repository.getMergedUpdate('cat-1')

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.byteLength).toBe(0)
      expect(mockPrisma.categoryUpdateLog.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
        orderBy: { createdAt: 'asc' },
      })
    })

    it('로그가 있으면 병합된 업데이트를 반환해야 한다', async () => {
      // 1. 'Hello'를 추가하는 첫 번째 업데이트 생성
      const docForUpdate1 = new Y.Doc()
      docForUpdate1.getText('content').insert(0, 'Hello')
      const update1 = Y.encodeStateAsUpdate(docForUpdate1)

      // 2. 첫 번째 업데이트 상태에서 ' World'를 추가하는 두 번째 업데이트(diff) 생성
      const docForUpdate2 = new Y.Doc()
      Y.applyUpdate(docForUpdate2, update1) // 첫 번째 업데이트 적용
      docForUpdate2.getText('content').insert(5, ' World')
      const stateVectorAfter1 = Y.encodeStateVector(docForUpdate1)
      const update2 = Y.encodeStateAsUpdate(docForUpdate2, stateVectorAfter1) // diff 생성

      // DB에서 순차적인 로그들을 가져온 것처럼 모킹
      mockPrisma.categoryUpdateLog.findMany.mockResolvedValue([{ updateData: Buffer.from(update1) }, { updateData: Buffer.from(update2) }])

      const result = await repository.getMergedUpdate('cat-1')

      // 병합된 결과 검증
      const resultDoc = new Y.Doc()
      Y.applyUpdate(resultDoc, result)

      const content = resultDoc.getText('content').toJSON()
      expect(content).toBe('Hello World')
    })
  })

  describe('saveUpdateLog', () => {
    it('업데이트 로그를 DB에 저장해야 한다', async () => {
      const update = new Uint8Array([1, 2, 3])

      await repository.saveUpdateLog('cat-1', update)

      expect(mockPrisma.categoryUpdateLog.create).toHaveBeenCalledWith({
        data: {
          categoryId: 'cat-1',
          updateData: Buffer.from(update),
        },
      })
    })
  })
})
