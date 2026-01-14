import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Category, Prisma } from '@prisma/client'
import type { Socket } from 'socket.io'
import { CategoryRepository } from './category.repository'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { UserService } from '@/user/user.service'
import { CategoryCreatedPayload, CategoryDeletedPayload } from './dto/category.s2c.dto'

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly broadcaster: SocketBroadcaster,
    private readonly userService: UserService,
  ) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.categoryRepository.findByRoomId(roomId)
  }

  async create(roomId: string, title: string): Promise<Category> {
    // 카테고리 개수 제한 확인
    const existingCategories = await this.categoryRepository.findByRoomId(roomId)
    if (existingCategories.length >= 10) {
      throw new BadRequestException('카테고리 개수 제한을 초과했습니다. (최대 10개)')
    }

    // orderIndex는 기존 최대값 + 1
    const maxOrderIndex = existingCategories.reduce((max, cat) => Math.max(max, cat.orderIndex), -1)
    const orderIndex = maxOrderIndex + 1

    return this.categoryRepository.create({
      roomId,
      title,
      orderIndex,
    })
  }

  async delete(categoryId: string, roomId: string): Promise<Category> {
    const existingCategories = await this.categoryRepository.findByRoomId(roomId)
    if (existingCategories.length <= 1) {
      throw new BadRequestException('최소 1개의 카테고리는 유지해야 합니다.')
    }

    try {
      return await this.categoryRepository.delete(categoryId)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('카테고리를 찾을 수 없습니다.')
      }
      throw error
    }
  }

  async createCategory(client: Socket, name: string) {
    const session = this.userService.getSession(client.id)
    if (!session) {
      client.emit('category:create:error', { message: '방에 참여하지 않았습니다.' })
      return
    }

    try {
      const category = await this.create(session.roomId, name)

      const response: CategoryCreatedPayload = {
        category_id: category.id,
        room_id: category.roomId,
        name: category.title,
        order: category.orderIndex,
        created_at: category.createdAt,
      }

      this.broadcaster.emitToRoom(category.roomId, 'category:created', response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '카테고리 생성에 실패했습니다.'
      client.emit('category:create:error', { message: errorMessage })
    }
  }

  async deleteCategory(client: Socket, categoryId: string) {
    const session = this.userService.getSession(client.id)
    if (!session) {
      client.emit('category:delete:error', { message: '방에 참여하지 않았습니다.' })
      return
    }

    try {
      const category = await this.delete(categoryId, session.roomId)

      const response: CategoryDeletedPayload = {
        category_id: category.id,
        deleted_at: new Date(),
      }

      this.broadcaster.emitToRoom(category.roomId, 'category:deleted', response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '카테고리 삭제에 실패했습니다.'
      client.emit('category:delete:error', { message: errorMessage })
    }
  }
}
