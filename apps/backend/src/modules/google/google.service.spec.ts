import { Test, TestingModule } from '@nestjs/testing'
import { GoogleService } from './google.service'
import { ConfigService } from '@nestjs/config'
import { RoomRepository } from '../room/room.repository'
import axios from 'axios'
import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GoogleService', () => {
  let service: GoogleService
  let roomRepository: RoomRepository
  let mockAxiosInstance: any

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-api-key'),
  }

  const mockRoomRepository = {
    findById: jest.fn(),
  }

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    }
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    mockedAxios.isAxiosError.mockReturnValue(true) // 기본적으로 Axios 에러로 처리

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleService, { provide: ConfigService, useValue: mockConfigService }, { provide: RoomRepository, useValue: mockRoomRepository }],
    }).compile()

    service = module.get<GoogleService>(GoogleService)
    roomRepository = module.get<RoomRepository>(RoomRepository)
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
      mockAxiosInstance.post.mockResolvedValue({
        data: { places: [{ id: 'place-1' }], nextPageToken: 'token' },
      })

      const result = await service.searchText(dto)

      expect(mockRoomRepository.findById).toHaveBeenCalledWith('room-1')
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
        }),
        expect.any(Object),
      )
      expect(result).toEqual({ places: [{ id: 'place-1' }], nextPageToken: 'token' })
    })

    it('Room이 존재하지 않으면 NotFound 예외를 던져야 한다', async () => {
      mockRoomRepository.findById.mockResolvedValue(null)

      await expect(service.searchText(dto)).rejects.toThrow(new CustomException(ErrorType.NotFound, 'Room을 찾을 수 없습니다.'))
    })

    it('API 호출 실패 시 예외를 처리해야 한다', async () => {
      mockRoomRepository.findById.mockResolvedValue({ x: 127.0, y: 37.0 })
      const errorResponse = { response: { status: 400, data: { error: { message: 'Bad Request' } } } }
      mockAxiosInstance.post.mockRejectedValue(errorResponse)
      mockedAxios.isAxiosError.mockReturnValue(true)

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
        }),
      )
      expect(result).toEqual(mockData)
    })

    it('장소를 찾을 수 없으면 NotFound 예외를 던져야 한다', async () => {
      const errorResponse = { response: { status: 404 } }
      mockAxiosInstance.get.mockRejectedValue(errorResponse)
      mockedAxios.isAxiosError.mockReturnValue(true)

      await expect(service.getPlaceDetails(dto)).rejects.toThrow(new CustomException(ErrorType.NotFound, '장소를 찾을 수 없습니다.'))
    })
  })

  describe('getPhoto', () => {
    const photoName = 'places/place-1/photos/photo-1'

    it('API 호출이 성공하면 이미지 버퍼와 컨텐츠 타입을 반환해야 한다', async () => {
      const mockBuffer = Buffer.from('image-data')
      // axios.get은 인스턴스가 아닌 axios 자체 함수로 호출됨 (코드 구현상)
      // 하지만 코드 구현을 보면 this.axiosInstance가 아니라 axios.get을 직접 쓰고 있음.
      // 따라서 axios.get을 Mocking해야 함.
      mockedAxios.get.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      })

      const result = await service.getPhoto(photoName)

      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(photoName), expect.objectContaining({ responseType: 'arraybuffer' }))
      expect(result).toEqual({
        data: mockBuffer,
        contentType: 'image/png',
      })
    })

    it('API 호출 실패 시 예외를 처리해야 한다', async () => {
      const errorResponse = { response: { status: 403 } }
      mockedAxios.get.mockRejectedValue(errorResponse)
      mockedAxios.isAxiosError.mockReturnValue(true)

      await expect(service.getPhoto(photoName)).rejects.toThrow(new CustomException(ErrorType.Unauthorized, 'Google API 인증 실패'))
    })
  })
})
