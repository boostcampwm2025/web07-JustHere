import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Injectable } from '@nestjs/common'
import { Category } from '@prisma/client'
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

    const existingCategories = await this.categoryRepository.findByRoomId(session.roomId)
    if (existingCategories.length >= 10) {
      throw new CustomException(ErrorType.CategoryOverFlowException, '카테고리 개수 제한을 초과했습니다. (최대 10개)')
    }

    const maxOrderIndex = existingCategories.reduce((max, cat) => Math.max(max, cat.orderIndex), -1)
    const orderIndex = maxOrderIndex + 1

    const category = await this.categoryRepository.create({
      roomId: session.roomId,
      title: name,
      orderIndex,
    })

    return { category, roomId: session.roomId }
  }

  async deleteCategory(clientId: string, categoryId: string): Promise<{ roomId: string; categoryId: string }> {
    const session = this.userService.getSession(clientId)

    if (!session) {
      throw new CustomException(ErrorType.NotInRoom, '방에 참여하지 않았습니다.')
    }

    const existingCategories = await this.categoryRepository.findByRoomId(session.roomId)

    if (existingCategories.length <= 1) {
      throw new CustomException(ErrorType.BadRequest, '최소 1개의 카테고리는 유지해야 합니다.')
    }

    const targetCategory = existingCategories.find(c => c.id === categoryId)
    if (!targetCategory) {
      throw new CustomException(ErrorType.NotFound, '삭제할 카테고리를 찾을 수 없습니다.')
    }

    await this.categoryRepository.delete(categoryId)

    return { roomId: session.roomId, categoryId }
  }
}
