import { Test, TestingModule } from '@nestjs/testing'
import { RoomActivitySchedulerService } from './room-activity-scheduler.service'
import { RoomRepository } from './room.repository'
import { Logger } from '@nestjs/common'

// 1. Repository Mocking
const mockRoomRepository = {
  updateManyLastActiveAt: jest.fn(),
  deleteRoomsInactiveSince: jest.fn(),
}

describe('RoomActivitySchedulerService', () => {
  let service: RoomActivitySchedulerService

  // Private 접근을 위한 타입 정의
  type ServiceWithPrivate = { activeRoomIds: Set<string> }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomActivitySchedulerService,
        {
          provide: RoomRepository,
          useValue: mockRoomRepository,
        },
      ],
    }).compile()

    service = module.get<RoomActivitySchedulerService>(RoomActivitySchedulerService)

    // 각 테스트 전에 Mock 초기화
    jest.clearAllMocks()

    // Private Set 초기화 (테스트 간 상태 간섭 방지)
    ;(service as unknown as ServiceWithPrivate).activeRoomIds = new Set()
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  describe('markAsActive', () => {
    it('activeRoomIds Set에 roomId를 추가해야 한다', () => {
      service.markAsActive('room-1')
      service.markAsActive('room-2')
      service.markAsActive('room-1') // 중복 추가 시도

      // Private 속성 접근

      const activeSet = (service as unknown as ServiceWithPrivate).activeRoomIds

      expect(activeSet.size).toBe(2)
      expect(activeSet.has('room-1')).toBe(true)
      expect(activeSet.has('room-2')).toBe(true)
    })
  })

  describe('flushActivityToDb', () => {
    it('활성화된 방이 없으면 아무 작업도 수행하지 않아야 한다', async () => {
      await service.flushActivityToDb()

      expect(mockRoomRepository.updateManyLastActiveAt).not.toHaveBeenCalled()
    })

    it('성공 시 DB를 업데이트하고 Set을 비워야 한다', async () => {
      // Given
      service.markAsActive('room-A')
      service.markAsActive('room-B')
      mockRoomRepository.updateManyLastActiveAt.mockResolvedValue(undefined)

      // When
      await service.flushActivityToDb()

      // Then
      // 1. Repository가 호출되었는지 확인
      expect(mockRoomRepository.updateManyLastActiveAt).toHaveBeenCalledTimes(1)

      // 2. 호출 인자 검증
      const [idsArg, dateArg] = mockRoomRepository.updateManyLastActiveAt.mock.calls[0] as [string[], Date]
      expect(idsArg).toEqual(expect.arrayContaining(['room-A', 'room-B']))
      expect(dateArg).toBeInstanceOf(Date)

      // 3. 메모리 Set이 비워졌는지 확인

      expect((service as unknown as ServiceWithPrivate).activeRoomIds.size).toBe(0)
    })

    it('DB 업데이트 실패 시 ID들을 다시 Set으로 복구해야 한다', async () => {
      // Given
      service.markAsActive('room-Fail')
      const error = new Error('DB Error')
      mockRoomRepository.updateManyLastActiveAt.mockRejectedValue(error)

      // Logger 에러 스파이 (콘솔에 에러 찍히는 것 방지)
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})

      // When
      await service.flushActivityToDb()

      // Then
      expect(mockRoomRepository.updateManyLastActiveAt).toHaveBeenCalled()

      // ✨ 핵심: 에러 발생 후 ID가 다시 Set에 복구되었는지 확인

      const activeSet = (service as unknown as ServiceWithPrivate).activeRoomIds
      expect(activeSet.size).toBe(1)
      expect(activeSet.has('room-Fail')).toBe(true)

      expect(loggerSpy).toHaveBeenCalled()
    })
  })

  describe('cleanUpGhostRooms', () => {
    // 날짜 계산 테스트를 위해 가짜 타이머 사용
    beforeAll(() => {
      jest.useFakeTimers()
      // 기준 시간 고정: 2024년 5월 1일
      jest.setSystemTime(new Date('2024-05-01T00:00:00Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('정확한 임계 날짜(90일 전)를 계산하여 Repository를 호출해야 한다', async () => {
      // Given
      const deletedCount = 10
      mockRoomRepository.deleteRoomsInactiveSince.mockResolvedValue(deletedCount)
      const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})

      // When
      await service.cleanUpGhostRooms()

      // Then
      // 90일 전 계산: 2024-05-01 - 90일 = 2024-02-01
      const expectedThreshold = new Date('2024-05-01T00:00:00Z')
      expectedThreshold.setDate(expectedThreshold.getDate() - 90)

      expect(mockRoomRepository.deleteRoomsInactiveSince).toHaveBeenCalledTimes(1)
      expect(mockRoomRepository.deleteRoomsInactiveSince).toHaveBeenCalledWith(expectedThreshold)

      // 성공 로그 확인
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(`[Success] Deleted ${deletedCount} ghost rooms`))
    })

    it('삭제된 방이 없으면 로그를 남겨야 한다', async () => {
      mockRoomRepository.deleteRoomsInactiveSince.mockResolvedValue(0)
      const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})

      await service.cleanUpGhostRooms()

      expect(loggerSpy).toHaveBeenCalledWith('No ghost rooms found to delete.')
    })

    it('에러 발생 시 예외를 적절히 처리해야 한다', async () => {
      const error = new Error('Delete Failed')
      mockRoomRepository.deleteRoomsInactiveSince.mockRejectedValue(error)
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})

      await service.cleanUpGhostRooms()

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[Error] Failed to cleanup'), error)
    })
  })
})
