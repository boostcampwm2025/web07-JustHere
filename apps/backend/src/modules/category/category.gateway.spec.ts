import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import { CategoryGateway } from './category.gateway'
import { CategoryService } from './category.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { CreateCategoryPayload, DeleteCategoryPayload } from './dto/category.c2s.dto'

describe('CategoryGateway', () => {
  let gateway: CategoryGateway

  // Mock 객체 정의 (useValue용)
  const mockCategoryService = {
    createCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }

  const mockBroadcaster = {
    setServer: jest.fn(),
    emitToRoom: jest.fn(),
  }

  // Socket & Server Mock
  const mockSocket = {
    id: 'socket-1',
  } as unknown as Socket

  const mockServer = {} as unknown as Server

  const roomId = 'room-1'
  const categoryId = 'cat-1'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryGateway,
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: RoomBroadcaster, useValue: mockBroadcaster },
      ],
    }).compile()

    gateway = module.get<CategoryGateway>(CategoryGateway)

    // Gateway에 Server 주입 (필요한 경우)
    gateway.server = mockServer
  })

  describe('afterInit', () => {
    it('Gateway 초기화 시 SocketBroadcaster에 서버를 주입한다', () => {
      gateway.afterInit(mockServer)
      expect(mockBroadcaster.setServer).toHaveBeenCalledWith(mockServer)
    })
  })

  describe('onCreateCategory', () => {
    it('CategoryService를 호출하고 결과를 브로드캐스트한다', async () => {
      const payload: CreateCategoryPayload = { name: '카페' }
      const mockCategory = { id: categoryId, title: '카페' }

      mockCategoryService.createCategory.mockResolvedValue({
        category: mockCategory,
        roomId,
      })

      await gateway.onCreateCategory(mockSocket, payload)

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(mockSocket.id, payload.name)
      expect(mockBroadcaster.emitToRoom).toHaveBeenCalledWith(roomId, 'category:created', {
        categoryId: mockCategory.id,
        name: mockCategory.title,
      })
    })
  })

  describe('onDeleteCategory', () => {
    it('CategoryService를 호출하고 결과를 브로드캐스트한다', async () => {
      const payload: DeleteCategoryPayload = { categoryId }

      mockCategoryService.deleteCategory.mockResolvedValue({
        roomId,
        categoryId,
      })

      await gateway.onDeleteCategory(mockSocket, payload)

      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(mockSocket.id, payload.categoryId)
      expect(mockBroadcaster.emitToRoom).toHaveBeenCalledWith(roomId, 'category:deleted', {
        categoryId,
      })
    })
  })
})
