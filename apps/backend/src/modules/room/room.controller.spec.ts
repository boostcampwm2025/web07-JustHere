import { Test, TestingModule } from '@nestjs/testing'
import type { Room } from '@prisma/client'
import { RoomController } from './room.controller'
import { RoomService } from './room.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'

describe('RoomController', () => {
  let controller: RoomController
  let service: {
    createRoom: jest.Mock
    updateRoom: jest.Mock
  }

  beforeEach(async () => {
    service = {
      createRoom: jest.fn(),
      updateRoom: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: service,
        },
      ],
    }).compile()

    controller = module.get<RoomController>(RoomController)
  })

  describe('POST /room/create', () => {
    it('방 생성 요청을 처리하고 RoomResponseDto를 반환해야 한다', async () => {
      const dto: CreateRoomDto = {
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      }

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

      service.createRoom.mockResolvedValue(mockRoom)

      const result = await controller.createRoom(dto)

      expect(result).toEqual(mockRoom)
      expect(service.createRoom).toHaveBeenCalledWith({
        x: dto.x,
        y: dto.y,
        place_name: dto.place_name,
      })
    })

    it('place_name 없이 방 생성 요청을 처리할 수 있어야 한다', async () => {
      const dto: CreateRoomDto = {
        x: 127.027621,
        y: 37.497952,
      }

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

      service.createRoom.mockResolvedValue(mockRoom)

      const result = await controller.createRoom(dto)

      expect(result).toEqual(mockRoom)

      expect(service.createRoom).toHaveBeenCalledWith({
        x: dto.x,
        y: dto.y,
        place_name: undefined,
      })
    })
  })

  describe('PATCH /room/:slug', () => {
    it('방 지역 수정 요청을 처리하고 RoomResponseDto를 반환해야 한다', async () => {
      const slug = 'a3k9m2x7'
      const dto: UpdateRoomDto = {
        x: 127.1,
        y: 37.5,
        place_name: '잠실역',
      }

      const mockRoom: Room = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug,
        x: 127.1,
        y: 37.5,
        place_name: '잠실역',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      }

      service.updateRoom.mockResolvedValue(mockRoom)

      const result = await controller.updateRoom(slug, dto)

      expect(result).toEqual(mockRoom)
      expect(service.updateRoom).toHaveBeenCalledWith(slug, dto)
    })
  })
})
