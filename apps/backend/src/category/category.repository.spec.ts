import { Test, TestingModule } from '@nestjs/testing';
import type { Category } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { CategoryRepository } from './category.repository';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prisma: { category: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
  });

  describe('findByRoomId', () => {
    it('roomId로 카테고리 목록을 조회한다', async () => {
      const roomId = 'room-1';
      const now = new Date();
      const categories: Category[] = [
        { id: 'cat-1', title: '음식', orderIndex: 0, roomId, createdAt: now },
        { id: 'cat-2', title: '카페', orderIndex: 1, roomId, createdAt: now },
      ];

      prisma.category.findMany.mockResolvedValue(categories);

      const result = await repository.findByRoomId(roomId);

      expect(result).toEqual(categories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { roomId },
        orderBy: { orderIndex: 'asc' },
      });
    });

    it('해당 roomId에 카테고리가 없으면 빈 배열을 반환한다', async () => {
      const roomId = 'empty-room';

      prisma.category.findMany.mockResolvedValue([]);

      const result = await repository.findByRoomId(roomId);

      expect(result).toEqual([]);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { roomId },
        orderBy: { orderIndex: 'asc' },
      });
    });

    it('orderIndex 오름차순으로 정렬하여 조회한다', async () => {
      const roomId = 'room-1';

      prisma.category.findMany.mockResolvedValue([]);

      await repository.findByRoomId(roomId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { orderIndex: 'asc' },
        }),
      );
    });
  });
});
