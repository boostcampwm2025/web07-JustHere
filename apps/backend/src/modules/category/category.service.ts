import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Category, Prisma } from '@prisma/client'
import type { Socket } from 'socket.io'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { UserService } from '@/modules/user/user.service'
import { CategoryRepository } from './category.repository'
import { CategoryCreatedPayload, CategoryDeletedPayload, CategoryErrorPayload } from './dto/category.s2c.dto'

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly broadcaster: RoomBroadcaster,
    private readonly userService: UserService,
  ) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.categoryRepository.findByRoomId(roomId)
  }

  async createCategory(client: Socket, name: string) {
    const session = this.userService.getSession(client.id)
    if (!session) {
      const errorPayload: CategoryErrorPayload = {
        code: 'NOT_IN_ROOM',
        message: '방에 참여하지 않았습니다.',
      }
      client.emit('category:error', errorPayload)
      return
    }

    try {
      const existingCategories = await this.categoryRepository.findByRoomId(session.roomId)
      if (existingCategories.length >= 10) {
        throw new BadRequestException('카테고리 개수 제한을 초과했습니다. (최대 10개)')
      }

      const maxOrderIndex = existingCategories.reduce((max, cat) => Math.max(max, cat.orderIndex), -1)
      const orderIndex = maxOrderIndex + 1

      const category = await this.categoryRepository.create({
        roomId: session.roomId,
        title: name,
        orderIndex,
      })

      const response: CategoryCreatedPayload = {
        categoryId: category.id,
        name: category.title,
      }

      this.broadcaster.emitToRoom(category.roomId, 'category:created', response)
    } catch (error) {
      if (error instanceof BadRequestException) {
        const errorPayload: CategoryErrorPayload = {
          code: 'BAD_REQUEST',
          message: error.message,
        }
        client.emit('category:error', errorPayload)
        return
      }

      if (error instanceof NotFoundException) {
        const errorPayload: CategoryErrorPayload = {
          code: 'NOT_FOUND',
          message: error.message,
        }
        client.emit('category:error', errorPayload)
        return
      }

      const errorPayload: CategoryErrorPayload = {
        code: 'INTERNAL_ERROR',
        message: '카테고리 생성에 실패했습니다.',
      }
      client.emit('category:error', errorPayload)
    }
  }

  async deleteCategory(client: Socket, categoryId: string) {
    const session = this.userService.getSession(client.id)
    if (!session) {
      const errorPayload: CategoryErrorPayload = {
        code: 'NOT_IN_ROOM',
        message: '방에 참여하지 않았습니다.',
      }
      client.emit('category:error', errorPayload)
      return
    }

    try {
      const existingCategories = await this.categoryRepository.findByRoomId(session.roomId)
      if (existingCategories.length <= 1) {
        throw new BadRequestException('최소 1개의 카테고리는 유지해야 합니다.')
      }

      let category: Category
      try {
        category = await this.categoryRepository.delete(categoryId)
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw new NotFoundException('카테고리를 찾을 수 없습니다.')
        }
        throw error
      }

      const response: CategoryDeletedPayload = {
        categoryId: category.id,
      }

      this.broadcaster.emitToRoom(category.roomId, 'category:deleted', response)
    } catch (error) {
      if (error instanceof BadRequestException) {
        const errorPayload: CategoryErrorPayload = {
          code: 'BAD_REQUEST',
          message: error.message,
        }
        client.emit('category:error', errorPayload)
        return
      }

      if (error instanceof NotFoundException) {
        const errorPayload: CategoryErrorPayload = {
          code: 'NOT_FOUND',
          message: error.message,
        }
        client.emit('category:error', errorPayload)
        return
      }

      const errorPayload: CategoryErrorPayload = {
        code: 'INTERNAL_ERROR',
        message: '카테고리 삭제에 실패했습니다.',
      }
      client.emit('category:error', errorPayload)
    }
  }
}
