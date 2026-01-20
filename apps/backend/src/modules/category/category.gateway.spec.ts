import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import { CategoryGateway } from './category.gateway'
import { CategoryService } from './category.service'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { CreateCategoryPayload, DeleteCategoryPayload } from './dto/category.c2s.dto'

describe('CategoryGateway', () => {
  let gateway: CategoryGateway

  const categoryService = {
    createCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }

  const broadcaster = {
    setServer: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryGateway, { provide: CategoryService, useValue: categoryService }, { provide: RoomBroadcaster, useValue: broadcaster }],
    }).compile()

    gateway = module.get(CategoryGateway)
  })

  describe('afterInit', () => {
    it('Gateway 초기화 시 SocketBroadcaster에 서버를 주입한다', () => {
      const server = {} as Server

      gateway.afterInit(server)

      expect(broadcaster.setServer).toHaveBeenCalledTimes(1)
      expect(broadcaster.setServer).toHaveBeenCalledWith(server)
    })
  })

  describe('onCreateCategory', () => {
    it('CategoryService.createCategory를 올바른 인자와 함께 호출한다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      // Act
      await gateway.onCreateCategory(client, payload)

      // Assert
      expect(categoryService.createCategory).toHaveBeenCalledTimes(1)
      expect(categoryService.createCategory).toHaveBeenCalledWith(client, payload.name)
    })
  })

  describe('onDeleteCategory', () => {
    it('CategoryService.deleteCategory를 올바른 인자와 함께 호출한다', async () => {
      const client = {} as Socket
      const payload: DeleteCategoryPayload = {
        categoryId: 'c1d2e3f4-a5b6-7890-cdef-0123456789ab',
      }

      // Act
      await gateway.onDeleteCategory(client, payload)

      // Assert
      expect(categoryService.deleteCategory).toHaveBeenCalledTimes(1)
      expect(categoryService.deleteCategory).toHaveBeenCalledWith(client, payload.categoryId)
    })
  })
})
