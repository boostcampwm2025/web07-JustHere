import { Injectable } from '@nestjs/common'
import { Category } from '@prisma/client'
import { PrismaService } from '@/lib/prisma/prisma.service'

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { roomId },
      orderBy: { orderIndex: 'asc' },
    })
  }

  async create(data: { roomId: string; title: string; orderIndex?: number }): Promise<Category> {
    return this.prisma.category.create({
      data: {
        roomId: data.roomId,
        title: data.title,
        orderIndex: data.orderIndex ?? 0,
      },
    })
  }

  async delete(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    })
  }
}
