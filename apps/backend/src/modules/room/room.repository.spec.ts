import { Test, TestingModule } from '@nestjs/testing'
import type { Room, Prisma } from '@prisma/client'
import { RoomRepository } from './room.repository'
import { PrismaService } from '@/lib/prisma/prisma.service'
import { CustomException } from '@/lib/exceptions/custom.exception'

describe('RoomRepository', () => {
  let repository: RoomRepository

  // 1. PrismaService에서 사용할 메서드만 타입을 정의합니다.
  // 이렇게 하면 'as jest.Mock'을 매번 사용하지 않아도 됩니다.
  let prisma: {
    room: {
      create: jest.Mock
      findUnique: jest.Mock
      update: jest.Mock
      updateMany: jest.Mock
      deleteMany: jest.Mock
    }
  }

  // 공통 Mock Room 객체
  const mockRoom: Room = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'a3k9m2x7',
    x: 127.027621,
    y: 37.497952,
    place_name: '강남역',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
  }

  beforeEach(async () => {
    // 2. Mock 구현체 정의 (jest.fn()으로 초기화)
    prisma = {
      room: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRepository,
        {
          provide: PrismaService,
          // 3. 타입 불일치 해결: 우리가 만든 객체는 PrismaService의 일부이므로 강제 단언
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile()

    repository = module.get<RoomRepository>(RoomRepository)
  })

  describe('createRoom', () => {
    it('방을 생성하고 slug를 포함한 Room 객체를 반환해야 한다', async () => {
      // jest.spyOn 대신 직접 mockResolvedValue 사용 가능
      prisma.room.create.mockResolvedValue(mockRoom)

      const result = await repository.createRoom({
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      })

      expect(result).toEqual(mockRoom)
      expect(result.slug).toHaveLength(8)
      expect(result.slug).toMatch(/^[a-z0-9]+$/)

      // prisma.room.create가 이미 jest.Mock 타입이므로 'as jest.Mock' 불필요
      expect(prisma.room.create).toHaveBeenCalledWith({
        // unsafe-assignment 해결: 구체적인 타입 단언 유지
        data: expect.objectContaining({
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
          slug: expect.any(String) as string,
        }) as Prisma.RoomCreateInput,
      })
    })

    it('place_name이 없으면 빈 문자열로 저장해야 한다', async () => {
      const mockRoomNoPlace = { ...mockRoom, place_name: '' }
      prisma.room.create.mockResolvedValue(mockRoomNoPlace)

      await repository.createRoom({
        x: 127.027621,
        y: 37.497952,
      })

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          place_name: '',
        }) as Prisma.RoomCreateInput,
      })
    })

    it('slug 중복 시 재시도해야 한다', async () => {
      const duplicateError = { code: 'P2002' }

      // mockRejectedValueOnce와 mockResolvedValueOnce 체이닝
      prisma.room.create.mockRejectedValueOnce(duplicateError).mockResolvedValueOnce(mockRoom)

      const result = await repository.createRoom({
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      })

      expect(result).toEqual(mockRoom)
      expect(prisma.room.create).toHaveBeenCalledTimes(2)
    })

    it('3회 재시도 후에도 실패하면 CustomException을 던져야 한다', async () => {
      const duplicateError = { code: 'P2002', message: 'Unique constraint failed' }
      prisma.room.create.mockRejectedValue(duplicateError)

      await expect(
        repository.createRoom({
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
        }),
      ).rejects.toThrow(CustomException)

      expect(prisma.room.create).toHaveBeenCalledTimes(3)
    })

    it('P2002가 아닌 다른 에러는 즉시 던져야 한다', async () => {
      const otherError = { code: 'P2003', message: 'Foreign key constraint failed' }
      prisma.room.create.mockRejectedValue(otherError)

      await expect(
        repository.createRoom({
          x: 127.027621,
          y: 37.497952,
        }),
      ).rejects.toEqual(otherError)

      expect(prisma.room.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('findBySlug', () => {
    it('slug로 방을 찾아 반환해야 한다', async () => {
      prisma.room.findUnique.mockResolvedValue(mockRoom)

      const result = await repository.findBySlug(mockRoom.slug)

      expect(result).toEqual(mockRoom)
      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { slug: mockRoom.slug },
      })
    })

    it('존재하지 않는 slug면 null을 반환해야 한다', async () => {
      prisma.room.findUnique.mockResolvedValue(null)

      const result = await repository.findBySlug('invalid-slug')

      expect(result).toBeNull()
    })
  })

  describe('findById', () => {
    it('id로 방을 찾아 반환해야 한다', async () => {
      prisma.room.findUnique.mockResolvedValue(mockRoom)

      const result = await repository.findById(mockRoom.id)

      expect(result).toEqual(mockRoom)
      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: mockRoom.id },
      })
    })

    it('존재하지 않는 id면 null을 반환해야 한다', async () => {
      prisma.room.findUnique.mockResolvedValue(null)

      const result = await repository.findById('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('updateBySlug', () => {
    it('slug로 방 정보를 업데이트해야 한다', async () => {
      const updateData = { x: 128.0, y: 38.0, place_name: '새로운 장소' }
      const updatedRoom = { ...mockRoom, ...updateData }

      prisma.room.update.mockResolvedValue(updatedRoom)

      const result = await repository.updateBySlug(mockRoom.slug, updateData)

      expect(result).toEqual(updatedRoom)
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { slug: mockRoom.slug },
        data: updateData,
      })
    })
  })

  describe('updateManyLastActiveAt', () => {
    it('여러 방의 활동 시간을 일괄 업데이트해야 한다', async () => {
      const ids = ['id-1', 'id-2']
      const date = new Date()
      // updateMany는 { count: number }를 반환함
      prisma.room.updateMany.mockResolvedValue({ count: 2 })

      await repository.updateManyLastActiveAt(ids, date)

      expect(prisma.room.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
        },
        data: {
          lastActiveAt: date,
        },
      })
    })
  })

  describe('deleteRoomsInactiveSince', () => {
    it('특정 날짜 이전의 방들을 삭제하고 삭제된 개수를 반환해야 한다', async () => {
      const thresholdDate = new Date()
      const deletedCount = 5
      prisma.room.deleteMany.mockResolvedValue({ count: deletedCount })

      const count = await repository.deleteRoomsInactiveSince(thresholdDate)

      expect(count).toBe(deletedCount)
      expect(prisma.room.deleteMany).toHaveBeenCalledWith({
        where: {
          lastActiveAt: {
            lt: thresholdDate,
          },
        },
      })
    })
  })
})
