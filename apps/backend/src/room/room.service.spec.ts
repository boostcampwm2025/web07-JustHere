import { Test, TestingModule } from '@nestjs/testing'
import { RoomService } from './room.service'
import { RoomRepository } from './room.repository'

describe('RoomService', () => {
  let service: RoomService
  let repository: RoomRepository

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: RoomRepository,
          useValue: {
            createRoom: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<RoomService>(RoomService)
    repository = module.get<RoomRepository>(RoomRepository)
  })

  describe('createRoom', () => {
    it('Repository를 호출하여 방을 생성해야 한다', async () => {
      const mockRoom = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const inputData = {
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '강남역',
      }

      jest.spyOn(repository, 'createRoom').mockResolvedValue(mockRoom)

      const result = await service.createRoom(inputData)

      expect(result).toEqual(mockRoom)
      expect(repository.createRoom).toHaveBeenCalledWith(inputData)
      expect(repository.createRoom).toHaveBeenCalledTimes(1)
    })

    it('place_name 없이 방을 생성할 수 있어야 한다', async () => {
      const mockRoom = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'a3k9m2x7',
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
        place_name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const inputData = {
        title: '우리 팀 모임',
        x: 127.027621,
        y: 37.497952,
      }

      jest.spyOn(repository, 'createRoom').mockResolvedValue(mockRoom)

      const result = await service.createRoom(inputData)

      expect(result).toEqual(mockRoom)
      expect(repository.createRoom).toHaveBeenCalledWith(inputData)
    })
  })
})
