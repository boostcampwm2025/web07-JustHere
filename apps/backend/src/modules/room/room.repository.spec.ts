import { Test, TestingModule } from '@nestjs/testing'
import type { Room, Prisma } from '@prisma/client'
import { RoomRepository } from './room.repository'
import { PrismaService } from '@/lib/prisma/prisma.service'
import { CustomException } from '@/lib/exceptions/custom.exception'

describe('RoomRepository', () => {
  let repository: RoomRepository

  // 1. PrismaService Mock 타입 정의
  let prisma: {
    room: {
      create: jest.Mock
      findUnique: jest.Mock
      findMany: jest.Mock
      update: jest.Mock
      updateMany: jest.Mock
      deleteMany: jest.Mock
    }
    $transaction: jest.Mock
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
    // 2. Mock 구현체 정의
    prisma = {
      room: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      // $transaction은 콜백을 받아서 실행하는 형태로 모킹
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) => {
        return await callback(prisma)
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRepository,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile()

    repository = module.get<RoomRepository>(RoomRepository)
  })

  describe('createRoom', () => {
    it('방을 생성하고 slug를 포함한 Room 객체를 반환해야 한다', async () => {
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

      const createSpy = jest.spyOn(prisma.room, 'create').mockResolvedValue(mockRoom as never)
      prisma.room.create.mockResolvedValue(mockRoom)

      const result = await repository.createRoom({
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      })

      expect(result).toEqual(mockRoom)
      expect(result.slug).toHaveLength(8)
      expect(result.slug).toMatch(/^[a-z0-9]+$/)

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          x: 127.027621,
          y: 37.497952,
          place_name: '강남역',
          slug: expect.any(String) as string,
        }) as Prisma.RoomCreateInput,
      })
    })

    it('place_name이 없으면 빈 문자열로 저장해야 한다', async () => {
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        x: 127.027621,
        y: 37.497952,
        place_name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      }

      const createSpy = jest.spyOn(prisma.room, 'create').mockResolvedValue(mockRoom as never)
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
      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'b4k8m3x9',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      }

      const createSpy = jest
        .spyOn(prisma.room, 'create')
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(mockRoom as never)
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
    it('특정 날짜 이전의 방들을 조회하고 삭제한 뒤 ID 목록을 반환해야 한다', async () => {
      const thresholdDate = new Date()
      const inactiveRooms = [{ id: 'room-1' }, { id: 'room-2' }]

      // 트랜잭션 내부 동작 모킹
      prisma.room.findMany.mockResolvedValue(inactiveRooms)
      prisma.room.deleteMany.mockResolvedValue({ count: 2 })

      const result = await repository.deleteRoomsInactiveSince(thresholdDate)

      expect(prisma.$transaction).toHaveBeenCalled()
      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: {
          lastActiveAt: {
            lt: thresholdDate,
          },
        },
        select: { id: true },
      })
      expect(prisma.room.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['room-1', 'room-2'],
          },
        },
      })
      expect(result).toEqual(['room-1', 'room-2'])
    })

    it('삭제할 방이 없으면 빈 배열을 반환해야 한다', async () => {
      const thresholdDate = new Date()

      prisma.room.findMany.mockResolvedValue([])

      const result = await repository.deleteRoomsInactiveSince(thresholdDate)

      expect(prisma.room.findMany).toHaveBeenCalled()
      expect(prisma.room.deleteMany).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })
})
