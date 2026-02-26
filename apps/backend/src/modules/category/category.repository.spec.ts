import { Test, TestingModule } from '@nestjs/testing'
import type { Category } from '@prisma/client'

import { PrismaService } from '@/lib/prisma/prisma.service'
import { CategoryRepository } from './category.repository'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

type MockPrismaService = {
  category: {
    findMany: jest.Mock
    create: jest.Mock
    delete: jest.Mock
    count: jest.Mock
    findFirst: jest.Mock
  }
  $transaction: jest.Mock
}

describe('CategoryRepository', () => {
  let repository: CategoryRepository
  let prisma: MockPrismaService

  beforeEach(async () => {
    const mockPrisma = {
      category: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    mockPrisma.$transaction.mockImplementation((callback: (tx: typeof mockPrisma) => Promise<any>) => {
      return callback(mockPrisma)
    })

    prisma = mockPrisma as unknown as MockPrismaService

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryRepository, { provide: PrismaService, useValue: prisma }],
    }).compile()

    repository = module.get<CategoryRepository>(CategoryRepository)
  })

  describe('findByRoomId', () => {
    it('roomId로 카테고리 목록을 조회한다', async () => {
      const roomId = 'a3k9m2x7'
      const now = new Date()
      const categories: Category[] = [
        { id: '6d739f00-5bbc-4a0a-8ace-58d27fca0c93', title: '음식', orderIndex: 0, roomId, createdAt: now },
        { id: 'cat-2', title: '카페', orderIndex: 1, roomId, createdAt: now },
      ]

      prisma.category.findMany.mockResolvedValue(categories)

      const result = await repository.findByRoomId(roomId)

      expect(result).toEqual(categories)
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { roomId },
        orderBy: { orderIndex: 'asc' },
      })
    })
  })

  describe('createWithLimit', () => {
    it('카테고리 개수가 제한을 초과하면 예외를 던진다', async () => {
      const roomId = 'room-1'
      const title = '새 카테고리'
      const limit = 10

      prisma.category.count.mockResolvedValue(10)

      await expect(repository.createWithLimit({ roomId, title }, limit)).rejects.toThrow(
        new CustomException(ErrorType.CategoryOverFlowException, `카테고리 개수 제한을 초과했습니다. (최대 ${limit}개)`),
      )
    })

    it('카테고리를 생성하고 반환한다', async () => {
      const roomId = 'room-1'
      const title = '새 카테고리'
      const limit = 10
      const now = new Date()
      const createdCategory: Category = {
        id: 'cat-1',
        roomId,
        title,
        orderIndex: 1,
        createdAt: now,
      }

      prisma.category.count.mockResolvedValue(5)
      prisma.category.findFirst.mockResolvedValue({ orderIndex: 0 })
      prisma.category.create.mockResolvedValue(createdCategory)

      const result = await repository.createWithLimit({ roomId, title }, limit)

      expect(result).toEqual(createdCategory)
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          roomId,
          title,
          orderIndex: 1,
        },
      })
    })
  })

  describe('deleteWithLimit', () => {
    it('카테고리 개수가 최소 제한 이하이면 예외를 던진다', async () => {
      const roomId = 'room-1'
      const categoryId = 'cat-1'
      const minLimit = 1

      prisma.category.count.mockResolvedValue(1)

      await expect(repository.deleteWithLimit(categoryId, roomId, minLimit)).rejects.toThrow(
        new CustomException(ErrorType.BadRequest, `최소 ${minLimit}개의 카테고리는 유지해야 합니다.`),
      )
    })

    it('카테고리를 삭제하고 반환한다', async () => {
      const roomId = 'room-1'
      const categoryId = 'cat-1'
      const minLimit = 1
      const now = new Date()
      const deletedCategory: Category = {
        id: categoryId,
        roomId,
        title: '삭제된 카테고리',
        orderIndex: 0,
        createdAt: now,
      }

      prisma.category.count.mockResolvedValue(2)
      prisma.category.delete.mockResolvedValue(deletedCategory)

      const result = await repository.deleteWithLimit(categoryId, roomId, minLimit)

      expect(result).toEqual(deletedCategory)
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      })
    })
  })
})
