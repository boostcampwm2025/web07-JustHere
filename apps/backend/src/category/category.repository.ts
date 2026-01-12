import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Category } from '@prisma/client';

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
