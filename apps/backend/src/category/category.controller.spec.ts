import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import type { Category } from '@prisma/client'
import { CategoryController } from './category.controller'
import { CategoryService } from './category.service'

describe('CategoryController', () => {
  let controller: CategoryController

  const roomId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const userId = 'f9e8d7c6-b5a4-3210-fedc-ba9876543210'
  const categoryId = 'c1d2e3f4-a5b6-7890-cdef-0123456789ab'
  const now = new Date()

  const mockCategory: Category = {
    id: categoryId,
    roomId,
    title: '카페',
    orderIndex: 0,
    createdAt: now,
  }

  const categoryServiceMock = {
    create: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: categoryServiceMock,
        },
      ],
    }).compile()

    controller = module.get<CategoryController>(CategoryController)
  })

  describe('createCategory', () => {
    it('카테고리를 생성한다', async () => {
      const dto = { room_id: roomId, name: '카페', user_id: userId }
      categoryServiceMock.create.mockResolvedValue(mockCategory)

      const result = await controller.createCategory(dto)

      expect(result).toEqual({
        category_id: mockCategory.id,
        room_id: mockCategory.roomId,
        name: mockCategory.title,
        order: mockCategory.orderIndex,
        created_at: mockCategory.createdAt,
      })
      expect(categoryServiceMock.create).toHaveBeenCalledWith(roomId, '카페', userId)
    })

    it('카테고리 개수 제한 초과 시 BadRequestException을 던진다', async () => {
      const dto = { room_id: roomId, name: '카페', user_id: userId }
      const error = new BadRequestException('카테고리 개수 제한을 초과했습니다. (최대 10개)')
      categoryServiceMock.create.mockRejectedValue(error)

      await expect(controller.createCategory(dto)).rejects.toThrow(BadRequestException)
      expect(categoryServiceMock.create).toHaveBeenCalledWith(roomId, '카페', userId)
    })

    it('권한이 없으면 ForbiddenException을 던진다', async () => {
      const dto = { room_id: roomId, name: '카페', user_id: userId }
      const error = new ForbiddenException('해당 방에 대한 권한이 없습니다.')
      categoryServiceMock.create.mockRejectedValue(error)

      await expect(controller.createCategory(dto)).rejects.toThrow(ForbiddenException)
      expect(categoryServiceMock.create).toHaveBeenCalledWith(roomId, '카페', userId)
    })

    it('방이 존재하지 않으면 NotFoundException을 던진다', async () => {
      const dto = { room_id: roomId, name: '카페', user_id: userId }
      const error = new NotFoundException('방을 찾을 수 없습니다.')
      categoryServiceMock.create.mockRejectedValue(error)

      await expect(controller.createCategory(dto)).rejects.toThrow(NotFoundException)
      expect(categoryServiceMock.create).toHaveBeenCalledWith(roomId, '카페', userId)
    })
  })

  describe('deleteCategory', () => {
    it('카테고리를 삭제한다', async () => {
      const query = { room_id: roomId, user_id: userId }
      categoryServiceMock.delete.mockResolvedValue(mockCategory)

      const result = await controller.deleteCategory(categoryId, query)

      expect(result.category_id).toBe(mockCategory.id)
      expect(result.deleted_at).toBeInstanceOf(Date)
      expect(categoryServiceMock.delete).toHaveBeenCalledWith(categoryId, roomId, userId)
    })

    it('최소 카테고리 개수 미만 시 BadRequestException을 던진다', async () => {
      const query = { room_id: roomId, user_id: userId }
      const error = new BadRequestException('최소 1개의 카테고리는 유지해야 합니다.')
      categoryServiceMock.delete.mockRejectedValue(error)

      await expect(controller.deleteCategory(categoryId, query)).rejects.toThrow(BadRequestException)
      expect(categoryServiceMock.delete).toHaveBeenCalledWith(categoryId, roomId, userId)
    })

    it('권한이 없으면 ForbiddenException을 던진다', async () => {
      const query = { room_id: roomId, user_id: userId }
      const error = new ForbiddenException('해당 방에 대한 권한이 없습니다.')
      categoryServiceMock.delete.mockRejectedValue(error)

      await expect(controller.deleteCategory(categoryId, query)).rejects.toThrow(ForbiddenException)
      expect(categoryServiceMock.delete).toHaveBeenCalledWith(categoryId, roomId, userId)
    })

    it('방이 존재하지 않으면 NotFoundException을 던진다', async () => {
      const query = { room_id: roomId, user_id: userId }
      const error = new NotFoundException('방을 찾을 수 없습니다.')
      categoryServiceMock.delete.mockRejectedValue(error)

      await expect(controller.deleteCategory(categoryId, query)).rejects.toThrow(NotFoundException)
      expect(categoryServiceMock.delete).toHaveBeenCalledWith(categoryId, roomId, userId)
    })

    it('카테고리가 존재하지 않으면 NotFoundException을 던진다', async () => {
      const query = { room_id: roomId, user_id: userId }
      const error = new NotFoundException('카테고리를 찾을 수 없습니다.')
      categoryServiceMock.delete.mockRejectedValue(error)

      await expect(controller.deleteCategory(categoryId, query)).rejects.toThrow(NotFoundException)
      expect(categoryServiceMock.delete).toHaveBeenCalledWith(categoryId, roomId, userId)
    })
  })
})
