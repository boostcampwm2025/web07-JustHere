import { Test, TestingModule } from '@nestjs/testing'
import type { Category } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { CategoryRepository } from './category.repository'

describe('CategoryRepository', () => {
  let repository: CategoryRepository
  let prisma: { category: { findMany: jest.Mock; create: jest.Mock; delete: jest.Mock } }

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    }

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

    it('해당 roomId에 카테고리가 없으면 빈 배열을 반환한다', async () => {
      const roomId = 'empty-room'

      prisma.category.findMany.mockResolvedValue([])

      const result = await repository.findByRoomId(roomId)

      expect(result).toEqual([])
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { roomId },
        orderBy: { orderIndex: 'asc' },
      })
    })

    it('orderIndex 오름차순으로 정렬하여 조회한다', async () => {
      const roomId = 'a3k9m2x7'

      prisma.category.findMany.mockResolvedValue([])

      await repository.findByRoomId(roomId)

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { orderIndex: 'asc' },
        }),
      )
    })
  })

  describe('create', () => {
    it('카테고리를 생성한다', async () => {
      const roomId = 'a3k9m2x7'
      const title = '카페'
      const now = new Date()
      const createdCategory: Category = {
        id: '6d739f00-5bbc-4a0a-8ace-58d27fca0c93',
        roomId,
        title,
        orderIndex: 0,
        createdAt: now,
      }

      prisma.category.create.mockResolvedValue(createdCategory)

      const result = await repository.create({ roomId, title })

      expect(result).toEqual(createdCategory)
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          roomId,
          title,
          orderIndex: 0,
        },
      })
    })

    it('orderIndex를 명시적으로 전달하면 해당 값으로 생성한다', async () => {
      const roomId = 'a3k9m2x7'
      const title = '음식'
      const orderIndex = 5
      const now = new Date()
      const createdCategory: Category = {
        id: '6d739f00-5bbc-4a0a-8ace-58d27fca0c93',
        roomId,
        title,
        orderIndex,
        createdAt: now,
      }

      prisma.category.create.mockResolvedValue(createdCategory)

      const result = await repository.create({ roomId, title, orderIndex })

      expect(result).toEqual(createdCategory)
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          roomId,
          title,
          orderIndex,
        },
      })
    })
  })

  describe('delete', () => {
    it('카테고리를 삭제한다', async () => {
      const categoryId = '6d739f00-5bbc-4a0a-8ace-58d27fca0c93'
      const roomId = 'a3k9m2x7'
      const now = new Date()
      const deletedCategory: Category = {
        id: categoryId,
        roomId,
        title: '카페',
        orderIndex: 0,
        createdAt: now,
      }

      prisma.category.delete.mockResolvedValue(deletedCategory)

      const result = await repository.delete(categoryId)

      expect(result).toEqual(deletedCategory)
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      })
    })
  })
})
