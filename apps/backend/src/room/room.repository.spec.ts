import { Test, TestingModule } from '@nestjs/testing'
import type { Room } from '@prisma/client'
import { DeepMockProxy, mockDeep } from 'jest-mock-extended'
import { RoomRepository } from './room.repository'
import { PrismaService } from '@/prisma/prisma.service'

describe('RoomRepository', () => {
  let repository: RoomRepository
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRepository,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile()

    repository = module.get<RoomRepository>(RoomRepository)
    prisma = module.get(PrismaService)
  })

  describe('createRoom', () => {
    it('방을 생성하고 slug를 포함한 Room 객체를 반환해야 한다', async () => {
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createSpy = jest.spyOn(prisma.room, 'create').mockResolvedValue(mockRoom as never)

      const result = await repository.createRoom({
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      })

      expect(result).toEqual(mockRoom)
      expect(result.slug).toHaveLength(8)
      expect(result.slug).toMatch(/^[a-z0-9]+$/)
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '우리 팀 모임',
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
          slug: expect.any(String) as string,
        }) as Partial<Room>,
      })
    })

    it('place_name이 없으면 빈 문자열로 저장해야 한다', async () => {
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createSpy = jest.spyOn(prisma.room, 'create').mockResolvedValue(mockRoom as never)

      await repository.createRoom({
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
      })

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          place_name: '',
        }) as Partial<Room>,
      })
    })

    it('slug 중복 시 재시도해야 한다', async () => {
      const duplicateError = { code: 'P2002' }
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'b4k8m3x9',
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createSpy = jest
        .spyOn(prisma.room, 'create')
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(mockRoom as never)

      const result = await repository.createRoom({
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      })

      expect(result).toEqual(mockRoom)
      expect(createSpy).toHaveBeenCalledTimes(2)
    })

    it('3회 재시도 후에도 실패하면 에러를 던져야 한다', async () => {
      const duplicateError = { code: 'P2002', message: 'Unique constraint failed' }

      const createSpy = jest.spyOn(prisma.room, 'create').mockRejectedValue(duplicateError)

      await expect(
        repository.createRoom({
          title: '우리 팀 모임',
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
        }),
      ).rejects.toThrow('최대 재시도 횟수 3 회를 초과하였습니다')

      expect(createSpy).toHaveBeenCalledTimes(3)
    })

    it('P2002가 아닌 다른 에러는 즉시 던져야 한다', async () => {
      const otherError = { code: 'P2003', message: 'Foreign key constraint failed' }

      const createSpy = jest.spyOn(prisma.room, 'create').mockRejectedValue(otherError)

      await expect(
        repository.createRoom({
          title: '우리 팀 모임',
          x: 127.027621,
          y: 37.497952,
        }),
      ).rejects.toEqual(otherError)

      expect(createSpy).toHaveBeenCalledTimes(1)
    })
  })
})
