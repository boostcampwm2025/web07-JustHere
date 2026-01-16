import { Test, TestingModule } from '@nestjs/testing'
import type { Server, Socket } from 'socket.io'
import type { ValidationError } from 'class-validator'
import * as classValidator from 'class-validator'

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
    it('유효한 payload가 전달되면 CategoryService.createCategory를 호출한다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      await gateway.onCreateCategory(client, payload)

      expect(categoryService.createCategory).toHaveBeenCalledTimes(1)

      const calls = categoryService.createCategory.mock.calls
      const [calledClient, calledName] = calls[0] as [Socket, string]

      expect(calledClient).toBe(client)
      expect(calledName).toBe('카페')
    })

    it('name이 문자열이 아니면 createCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { isString: 'name은 문자열이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onCreateCategory(client, payload)

      expect(categoryService.createCategory).not.toHaveBeenCalled()
    })

    it('name이 비어있으면 createCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { isNotEmpty: 'name은 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onCreateCategory(client, payload)

      expect(categoryService.createCategory).not.toHaveBeenCalled()
    })

    it('name이 1자 미만이면 createCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { length: 'name은 1자 이상 100자 이하여야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onCreateCategory(client, payload)

      expect(categoryService.createCategory).not.toHaveBeenCalled()
    })

    it('name이 100자 초과이면 createCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: CreateCategoryPayload = {
        name: '카페',
      }

      const validationError: ValidationError = {
        property: 'name',
        constraints: { length: 'name은 1자 이상 100자 이하여야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onCreateCategory(client, payload)

      expect(categoryService.createCategory).not.toHaveBeenCalled()
    })
  })

  describe('onDeleteCategory', () => {
    it('유효한 payload가 전달되면 CategoryService.deleteCategory를 호출한다', async () => {
      const client = {} as Socket
      const payload: DeleteCategoryPayload = {
        categoryId: 'c1d2e3f4-a5b6-7890-cdef-0123456789ab',
      }

      jest.spyOn(classValidator, 'validateSync').mockReturnValue([])

      await gateway.onDeleteCategory(client, payload)

      expect(categoryService.deleteCategory).toHaveBeenCalledTimes(1)

      const calls = categoryService.deleteCategory.mock.calls
      const [calledClient, calledCategoryId] = calls[0] as [Socket, string]

      expect(calledClient).toBe(client)
      expect(calledCategoryId).toBe('c1d2e3f4-a5b6-7890-cdef-0123456789ab')
    })

    it('categoryId가 문자열이 아니면 deleteCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: DeleteCategoryPayload = {
        categoryId: 'c1d2e3f4-a5b6-7890-cdef-0123456789ab',
      }

      const validationError: ValidationError = {
        property: 'categoryId',
        constraints: { isString: 'categoryId는 문자열이어야 합니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onDeleteCategory(client, payload)

      expect(categoryService.deleteCategory).not.toHaveBeenCalled()
    })

    it('categoryId가 비어있으면 deleteCategory를 호출하지 않는다', async () => {
      const client = {} as Socket
      const payload: DeleteCategoryPayload = {
        categoryId: 'c1d2e3f4-a5b6-7890-cdef-0123456789ab',
      }

      const validationError: ValidationError = {
        property: 'categoryId',
        constraints: { isNotEmpty: 'categoryId는 비어있을 수 없습니다' },
      }
      jest.spyOn(classValidator, 'validateSync').mockReturnValue([validationError])

      await gateway.onDeleteCategory(client, payload)

      expect(categoryService.deleteCategory).not.toHaveBeenCalled()
    })
  })
})
