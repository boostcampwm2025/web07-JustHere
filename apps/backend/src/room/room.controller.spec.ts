import { Test, TestingModule } from '@nestjs/testing'
import type { Room } from '@prisma/client'
import { RoomController } from './room.controller'
import { RoomService } from './room.service'
import { CreateRoomDto } from './dto/create-room.dto'

describe('RoomController', () => {
  let controller: RoomController
  let service: jest.Mocked<RoomService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<RoomController>(RoomController)
    service = module.get(RoomService)
  })

  describe('POST /room/create', () => {
    it('방 생성 요청을 처리하고 RoomResponseDto를 반환해야 한다', async () => {
      const dto: CreateRoomDto = {
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      }

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

      const createRoomSpy = jest.spyOn(service, 'createRoom').mockResolvedValue(mockRoom)

      const result = await controller.createRoom(dto)

      expect(result).toEqual(mockRoom)
      expect(createRoomSpy).toHaveBeenCalledWith({
        title: dto.title,
        x: dto.x,
        y: dto.y,
        place_name: dto.place_name,
      })
    })

    it('place_name 없이 방 생성 요청을 처리할 수 있어야 한다', async () => {
      const dto: CreateRoomDto = {
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
      }

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

      const createRoomSpy = jest.spyOn(service, 'createRoom').mockResolvedValue(mockRoom)

      const result = await controller.createRoom(dto)

      expect(result).toEqual(mockRoom)
      expect(createRoomSpy).toHaveBeenCalledWith({
        title: dto.title,
        x: dto.x,
        y: dto.y,
        place_name: undefined,
      })
    })
  })
})
