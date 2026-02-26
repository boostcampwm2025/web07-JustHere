import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Injectable } from '@nestjs/common'
import { Category, Prisma } from '@prisma/client'
import { UserService } from '@/modules/user/user.service'
import { CategoryRepository } from './category.repository'

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly userService: UserService,
  ) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.categoryRepository.findByRoomId(roomId)
  }

  async createCategory(clientId: string, name: string): Promise<{ category: Category; roomId: string }> {
    const session = this.userService.getSession(clientId)

    if (!session) {
      throw new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.')
    }

    const category = await this.categoryRepository.createWithLimit(
      {
        roomId: session.roomId,
        title: name,
      },
      10,
    )

    return { category, roomId: session.roomId }
  }

  async deleteCategory(clientId: string, categoryId: string): Promise<{ roomId: string; categoryId: string }> {
    const session = this.userService.getSession(clientId)

    if (!session) {
      throw new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.')
    }

    try {
      await this.categoryRepository.deleteWithLimit(categoryId, session.roomId, 1)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new CustomException(ErrorType.NotFound, '삭제할 카테고리를 찾을 수 없습니다.')
      }
      throw error
    }

    return { roomId: session.roomId, categoryId }
  }
}
