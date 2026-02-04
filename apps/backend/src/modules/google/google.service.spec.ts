import { Test, TestingModule } from '@nestjs/testing'
import { GoogleService } from './google.service'
import { ConfigService } from '@nestjs/config'
import { RoomRepository } from '../room/room.repository'
import axios from 'axios'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

// Axios 모듈 전체 모킹
jest.mock('axios')

describe('GoogleService', () => {
  let service: GoogleService

  // 1. 내부 의존성(Repository, Config)에 대한 Manual Mock 타입 정의
  let mockRoomRepository: {
    findById: jest.Mock
  }

  let mockConfigService: {
    getOrThrow: jest.Mock
  }

  // 2. Axios 인스턴스(create()로 생성되는 객체)에 대한 Mock 정의
  let mockAxiosInstance: {
    post: jest.Mock
    get: jest.Mock
  }

  beforeEach(async () => {
    // 3. Mock 구현체 초기화
    mockRoomRepository = {
      findById: jest.fn(),
    }

    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-api-key'),
    }

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    }

    // 4. axios.create가 우리가 만든 mockAxiosInstance를 반환하도록 설정
    ;(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance)
    // 에러 처리를 위해 isAxiosError가 true를 반환하도록 설정
    ;(axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true)

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleService, { provide: ConfigService, useValue: mockConfigService }, { provide: RoomRepository, useValue: mockRoomRepository }],
    }).compile()

    service = module.get<GoogleService>(GoogleService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined()
  })

  describe('searchText', () => {
    const dto = { textQuery: '맛집', roomId: 'room-1' }

    it('Room이 존재하고 API 호출이 성공하면 결과를 반환해야 한다', async () => {
      mockRoomRepository.findById.mockResolvedValue({ x: 127.0, y: 37.0 })

      const apiResponse = {
        data: { places: [{ id: 'place-1' }], nextPageToken: 'token' },
      }
      mockAxiosInstance.post.mockResolvedValue(apiResponse)

      const result = await service.searchText(dto)

      expect(mockRoomRepository.findById).toHaveBeenCalledWith('room-1')

      // Axios post 호출 검증
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/places:searchText',
        expect.objectContaining({
          textQuery: '맛집',
          locationBias: {
            circle: {
              center: { latitude: 37.0, longitude: 127.0 },
              radius: 2000,
            },
          },
        }) as Record<string, unknown>, // 구체적인 타입 단언으로 unsafe-assignment 해결
        expect.any(Object) as unknown,
      )

      expect(result).toEqual({ places: [{ id: 'place-1' }], nextPageToken: 'token' })
    })

    it('Room이 존재하지 않으면 NotFound 예외를 던져야 한다', async () => {
      mockRoomRepository.findById.mockResolvedValue(null)

      await expect(service.searchText(dto)).rejects.toThrow(
        new CustomException(ErrorType.BadGateway, 'Google API 호출 실패: Room을 찾을 수 없습니다.'),
      )
    })

    it('API 호출 실패 시 예외를 처리해야 한다', async () => {
      mockRoomRepository.findById.mockResolvedValue({ x: 127.0, y: 37.0 })

      const errorResponse = {
        response: { status: 400, data: { error: { message: 'Bad Request' } } },
      }
      mockAxiosInstance.post.mockRejectedValue(errorResponse)

      // isAxiosError는 beforeEach에서 true로 설정됨

      await expect(service.searchText(dto)).rejects.toThrow(new CustomException(ErrorType.BadRequest, '잘못된 요청입니다: Bad Request'))
    })
  })

  describe('getPlaceDetails', () => {
    const dto = { placeId: 'place-1' }

    it('API 호출이 성공하면 장소 상세 정보를 반환해야 한다', async () => {
      const mockData = { id: 'place-1', displayName: { text: 'Place 1' } }
      mockAxiosInstance.get.mockResolvedValue({ data: mockData })

      const result = await service.getPlaceDetails(dto)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/places/place-1',
        expect.objectContaining({
          params: { languageCode: 'ko' },
        }) as Record<string, unknown>,
      )
      expect(result).toEqual(mockData)
    })

    it('장소를 찾을 수 없으면 NotFound 예외를 던져야 한다', async () => {
      const errorResponse = { response: { status: 404 } }
      mockAxiosInstance.get.mockRejectedValue(errorResponse)

      await expect(service.getPlaceDetails(dto)).rejects.toThrow(new CustomException(ErrorType.NotFound, '장소를 찾을 수 없습니다.'))
    })
  })

  describe('getPhoto', () => {
    const photoName = 'places/place-1/photos/photo-1'

    it('API 호출이 성공하면 photoUri를 반환해야 한다', async () => {
      const mockPhotoUri = 'https://lh3.googleusercontent.com/places/...'

      // getPhoto 메서드는 정적 axios.get을 사용하므로 이를 모킹
      ;(axios.get as jest.Mock).mockResolvedValue({
        data: { photoUri: mockPhotoUri },
      })

      const result = await service.getPhoto(photoName)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(axios.get as jest.Mock).toHaveBeenCalledWith(expect.stringContaining(photoName))

      expect(result).toEqual({
        photoUri: mockPhotoUri,
      })
    })

    it('API 호출 실패 시 예외를 처리해야 한다', async () => {
      const errorResponse = { response: { status: 403 } }
      ;(axios.get as jest.Mock).mockRejectedValue(errorResponse)

      await expect(service.getPhoto(photoName)).rejects.toThrow(new CustomException(ErrorType.Unauthorized, 'Google API 인증 실패'))
    })
  })
})
