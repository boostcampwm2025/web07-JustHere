import { Test, TestingModule } from '@nestjs/testing'
import { GoogleController } from './google.controller'
import { GoogleService } from './google.service'

describe('GoogleController', () => {
  let controller: GoogleController

  let service: {
    searchText: jest.Mock
    getPlaceDetails: jest.Mock
    getPhoto: jest.Mock
  }

  beforeEach(async () => {
    service = {
      searchText: jest.fn(),
      getPlaceDetails: jest.fn(),
      getPhoto: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [
        {
          provide: GoogleService,
          // 3. 타입 호환성을 위해 강제 단언하여 주입
          useValue: service as unknown as GoogleService,
        },
      ],
    }).compile()

    controller = module.get<GoogleController>(GoogleController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('컨트롤러가 정의되어 있어야 한다', () => {
    expect(controller).toBeDefined()
  })

  describe('searchText', () => {
    it('서비스의 searchText를 호출하고 결과를 반환해야 한다', async () => {
      const dto = { textQuery: 'test' }
      const expectedResult = { places: [], nextPageToken: 'token' }

      service.searchText.mockResolvedValue(expectedResult)

      const result = await controller.searchText(dto)

      expect(service.searchText).toHaveBeenCalledWith(dto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('getPlaceDetails', () => {
    it('서비스의 getPlaceDetails를 호출하고 결과를 반환해야 한다', async () => {
      const placeId = 'place-1'
      const expectedResult = { id: placeId, displayName: { text: 'Place' } }

      service.getPlaceDetails.mockResolvedValue(expectedResult)

      const result = await controller.getPlaceDetails(placeId)

      expect(service.getPlaceDetails).toHaveBeenCalledWith({ placeId })
      expect(result).toEqual(expectedResult)
    })
  })

  describe('getPhoto', () => {
    it('서비스의 getPhoto를 호출하고 photoUri를 반환해야 한다', async () => {
      const placeId = 'place-1'
      const photoId = 'photo-1'
      const expectedResult = { photoUri: 'https://example.com/photo.jpg' }

      service.getPhoto.mockResolvedValue(expectedResult)

      const result = await controller.getPhoto(placeId, photoId)

      expect(service.getPhoto).toHaveBeenCalledWith(`places/${placeId}/photos/${photoId}`, 400, 400)
      expect(result).toEqual(expectedResult)
    })

    it('쿼리 파라미터로 크기를 지정하면 해당 크기로 호출해야 한다', async () => {
      const placeId = 'place-1'
      const photoId = 'photo-1'
      const maxWidth = 800
      const maxHeight = 600
      const expectedResult = { photoUri: 'https://example.com/photo.jpg' }

      service.getPhoto.mockResolvedValue(expectedResult)

      await controller.getPhoto(placeId, photoId, maxWidth, maxHeight)

      expect(service.getPhoto).toHaveBeenCalledWith(expect.any(String) as string, maxWidth, maxHeight)
    })
  })
})
