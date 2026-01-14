import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Category, Prisma } from '@prisma/client'
import { CategoryRepository } from './category.repository'
import { RoomService } from '@/room/room.service'
import { UserService } from '@/user/user.service'

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @Inject(forwardRef(() => RoomService))
    private readonly roomService: RoomService,
    private readonly userService: UserService,
  ) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.categoryRepository.findByRoomId(roomId)
  }

  async create(roomIdOrSlug: string, title: string, userId: string): Promise<Category> {
    // roomId가 UUID인지 slug인지 판별
    const actualRoomId = await this.resolveRoomId(roomIdOrSlug)

    // 해당 방에 속한 사용자인지 확인
    this.checkUserPermission(actualRoomId, userId)

    // 카테고리 개수 제한 확인
    const existingCategories = await this.categoryRepository.findByRoomId(actualRoomId)
    if (existingCategories.length >= 10) {
      throw new BadRequestException('카테고리 개수 제한을 초과했습니다. (최대 10개)')
    }

    // orderIndex는 기존 최대값 + 1
    const maxOrderIndex = existingCategories.reduce((max, cat) => Math.max(max, cat.orderIndex), -1)
    const orderIndex = maxOrderIndex + 1

    return this.categoryRepository.create({
      roomId: actualRoomId,
      title,
      orderIndex,
    })
  }

  async delete(categoryId: string, roomIdOrSlug: string, userId: string): Promise<Category> {
    // roomId가 UUID인지 slug인지 판별
    const actualRoomId = await this.resolveRoomId(roomIdOrSlug)

    // 해당 방에 속한 사용자인지 확인
    this.checkUserPermission(actualRoomId, userId)

    const existingCategories = await this.categoryRepository.findByRoomId(actualRoomId)
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

  /**
   * roomId 또는 slug를 받아서 실제 roomId(UUID)를 반환
   */
  private async resolveRoomId(roomIdOrSlug: string): Promise<string> {
    // UUID면 방 존재 확인 후 반환
    if (this.isUUID(roomIdOrSlug)) {
      const room = await this.roomService.findById(roomIdOrSlug)
      if (!room) {
        throw new NotFoundException('방을 찾을 수 없습니다.')
      }
      return roomIdOrSlug
    }

    // slug면 DB에서 UUID 조회
    const room = await this.roomService.findBySlug(roomIdOrSlug)
    if (!room) {
      throw new NotFoundException('방을 찾을 수 없습니다.')
    }
    return room.id
  }

  /**
   * 문자열이 UUID 형식인지 확인
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * 사용자가 해당 방에 속해있는지 권한 체크
   */
  private checkUserPermission(roomId: string, userId: string): void {
    const sessions = this.userService.getSessionsByRoom(roomId)
    const hasPermission = sessions.some(session => session.userId === userId)

    if (!hasPermission) {
      throw new ForbiddenException('해당 방에 대한 권한이 없습니다.')
    }
  }
}
