import { Injectable } from '@nestjs/common'
import { Category } from '@prisma/client'
import { PrismaService } from '@/lib/prisma/prisma.service'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { roomId },
      orderBy: { orderIndex: 'asc' },
    })
  }

  async count(roomId: string): Promise<number> {
    return this.prisma.category.count({
      where: { roomId },
    })
  }

  async createWithLimit(data: { roomId: string; title: string }, limit: number): Promise<Category> {
    return this.prisma.$transaction(async tx => {
      const count = await tx.category.count({
        where: { roomId: data.roomId },
      })

      if (count >= limit) {
        throw new CustomException(ErrorType.CategoryOverFlowException, `카테고리 개수 제한을 초과했습니다. (최대 ${limit}개)`)
      }

      const maxOrderIndex = await tx.category.findFirst({
        where: { roomId: data.roomId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      })

      const orderIndex = (maxOrderIndex?.orderIndex ?? -1) + 1

      return tx.category.create({
        data: {
          roomId: data.roomId,
          title: data.title,
          orderIndex,
        },
      })
    })
  }

  async deleteWithLimit(id: string, roomId: string, minLimit: number): Promise<Category> {
    return this.prisma.$transaction(async tx => {
      const count = await tx.category.count({
        where: { roomId },
      })

      if (count <= minLimit) {
        throw new CustomException(ErrorType.BadRequest, `최소 ${minLimit}개의 카테고리는 유지해야 합니다.`)
      }

      const target = await tx.category.findFirst({
        where: { id, roomId },
      })
      if (!target) {
        throw new CustomException(ErrorType.NotFound, '삭제할 카테고리를 찾을 수 없습니다.')
      }
      return tx.category.delete({
        where: { id: target.id },
      })
    })
  }
}
