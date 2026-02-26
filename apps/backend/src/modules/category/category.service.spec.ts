import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Test, TestingModule } from '@nestjs/testing'
import { CategoryRepository } from './category.repository'
import { UserService } from '@/modules/user/user.service'
import { CategoryService } from './category.service'

describe('CategoryService', () => {
  let service: CategoryService

  // Mock 객체 정의 (useValue용)
  const mockCategoryRepository = {
    findByRoomId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  }

  const mockUserService = {
    getSession: jest.fn(),
  }

  const roomId = 'room-1'
  const categoryId = 'cat-1'
  const socketId = 'socket-1'

  const mockCategory = {
    id: categoryId,
    roomId,
    title: '카페',
    orderIndex: 0,
  }

  const mockSession = {
    roomId,
    socketId,
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: mockCategoryRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile()

    service = module.get<CategoryService>(CategoryService)
  })

  describe('createCategory', () => {
    it('세션이 없으면 NotInRoom 예외를 던진다', async () => {
      mockUserService.getSession.mockReturnValue(null)

      await expect(service.createCategory(socketId, '새 카테고리')).rejects.toThrow(
        new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.'),
      )
    })

    it('카테고리가 10개 이상이면 CategoryOverFlowException 예외를 던진다', async () => {
      mockUserService.getSession.mockReturnValue(mockSession)
      mockCategoryRepository.findByRoomId.mockResolvedValue(new Array(10).fill(mockCategory))

      await expect(service.createCategory(socketId, '새 카테고리')).rejects.toThrow(
        new CustomException(ErrorType.CategoryOverFlowException, '카테고리 개수 제한을 초과했습니다. (최대 10개)'),
      )
    })

    it('카테고리를 생성하고 반환한다', async () => {
      mockUserService.getSession.mockReturnValue(mockSession)
      mockCategoryRepository.findByRoomId.mockResolvedValue([])
      mockCategoryRepository.create.mockResolvedValue(mockCategory)

      const result = await service.createCategory(socketId, '새 카테고리')

      expect(result).toEqual({ category: mockCategory, roomId })
      expect(mockCategoryRepository.create).toHaveBeenCalledWith({
        roomId,
        title: '새 카테고리',
        orderIndex: 0,
      })
    })
  })

  describe('deleteCategory', () => {
    it('세션이 없으면 NotInRoom 예외를 던진다', async () => {
      mockUserService.getSession.mockReturnValue(null)

      await expect(service.deleteCategory(socketId, categoryId)).rejects.toThrow(
        new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.'),
      )
    })

    it('카테고리가 1개 이하면 BadRequest 예외를 던진다', async () => {
      mockUserService.getSession.mockReturnValue(mockSession)
      mockCategoryRepository.findByRoomId.mockResolvedValue([mockCategory])

      await expect(service.deleteCategory(socketId, categoryId)).rejects.toThrow(
        new CustomException(ErrorType.BadRequest, '최소 1개의 카테고리는 유지해야 합니다.'),
      )
    })

    it('삭제할 카테고리가 없으면 NotFound 예외를 던진다', async () => {
      mockUserService.getSession.mockReturnValue(mockSession)
      mockCategoryRepository.findByRoomId.mockResolvedValue([mockCategory, { ...mockCategory, id: 'other' }])

      await expect(service.deleteCategory(socketId, 'non-existent')).rejects.toThrow(
        new CustomException(ErrorType.NotFound, '삭제할 카테고리를 찾을 수 없습니다.'),
      )
    })

    it('카테고리를 삭제하고 반환한다', async () => {
      mockUserService.getSession.mockReturnValue(mockSession)
      mockCategoryRepository.findByRoomId.mockResolvedValue([mockCategory, { ...mockCategory, id: 'other' }])
      mockCategoryRepository.delete.mockResolvedValue(mockCategory)

      const result = await service.deleteCategory(socketId, categoryId)

      expect(result).toEqual({ roomId, categoryId })
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(categoryId)
    })
  })
})
