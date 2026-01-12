import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoomId(roomId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { roomId },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
