import { plainToInstance } from 'class-transformer'
import { GooglePhotoDto, GooglePlaceDto, GoogleSearchResponseDto } from './google-place.dto'

describe('GooglePlaceDto', () => {
  it('일반 객체를 GooglePlaceDto 인스턴스로 변환할 수 있어야 한다', () => {
    const plainObject = {
      id: 'place-1',
      displayName: { text: 'Test Place', languageCode: 'ko' },
      formattedAddress: '123 Test St',
      location: { latitude: 37.5, longitude: 127.0 },
      rating: 4.5,
      photos: [{ name: 'photo-1', widthPx: 100, heightPx: 100 }],
    }

    const dto = plainToInstance(GooglePlaceDto, plainObject)

    expect(dto).toBeInstanceOf(GooglePlaceDto)
    expect(dto.id).toBe('place-1')
    expect(dto.displayName.text).toBe('Test Place')
    expect(dto.photos?.[0].name).toBe('photo-1')
    expect(dto.photos?.[0]).toBeInstanceOf(GooglePhotoDto)
  })
})

describe('GoogleSearchResponseDto', () => {
  it('일반 객체를 GoogleSearchResponseDto 인스턴스로 변환할 수 있어야 한다', () => {
    const plainObject = {
      places: [
        {
          id: 'place-1',
          displayName: { text: 'Test Place', languageCode: 'ko' },
        },
      ],
      nextPageToken: 'next-token',
    }

    const dto = plainToInstance(GoogleSearchResponseDto, plainObject)

    expect(dto).toBeInstanceOf(GoogleSearchResponseDto)
    expect(dto.places.length).toBe(1)
    expect(dto.places[0]).toBeInstanceOf(GooglePlaceDto)
    expect(dto.places[0].id).toBe('place-1')
    expect(dto.nextPageToken).toBe('next-token')
  })

  it('places가 없어도 변환할 수 있어야 한다', () => {
    const plainObject = {
      nextPageToken: 'next-token',
    }

    const dto = plainToInstance(GoogleSearchResponseDto, plainObject)

    expect(dto).toBeInstanceOf(GoogleSearchResponseDto)
    expect(dto.places).toBeUndefined()
  })

  it('places가 빈 배열이어도 변환할 수 있어야 한다', () => {
    const plainObject = {
      places: [],
      nextPageToken: 'next-token',
    }
    const dto = plainToInstance(GoogleSearchResponseDto, plainObject)
    expect(dto).toBeInstanceOf(GoogleSearchResponseDto)
    expect(dto.places).toEqual([])
  })
})
