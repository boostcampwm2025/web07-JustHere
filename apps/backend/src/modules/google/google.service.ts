import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { SearchTextDto } from './dto/search-text.dto'
import { PlaceDetailsDto } from './dto/place-details.dto'
import { GoogleSearchResponseDto, GooglePlaceDto } from './dto/google-place.dto'
import { RoomRepository } from '../room/room.repository'

@Injectable()
export class GoogleService {
  private readonly axiosInstance: AxiosInstance
  private readonly apiKey: string

  constructor(
    private readonly configService: ConfigService,
    private readonly roomRepository: RoomRepository,
  ) {
    this.apiKey = this.configService.getOrThrow<string>('GOOGLE_MAPS_API_KEY')

    this.axiosInstance = axios.create({
      baseURL: 'https://places.googleapis.com/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
    })
  }

  async searchText(dto: SearchTextDto): Promise<GoogleSearchResponseDto> {
    try {
      let latitude: number | undefined
      let longitude: number | undefined

      if (dto.roomId) {
        const room = await this.roomRepository.findById(dto.roomId)
        if (!room) {
          throw new CustomException(ErrorType.NotFound, 'Room을 찾을 수 없습니다.')
        }
        latitude = room.y
        longitude = room.x
      }

      const requestBody: Record<string, unknown> = {
        textQuery: dto.textQuery,
        languageCode: 'ko',
        maxResultCount: dto.maxResultCount ?? 20,
      }

      if (latitude !== undefined && longitude !== undefined) {
        requestBody.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: dto.radius ?? 2000,
          },
        }
      }

      if (dto.pageToken) {
        requestBody.pageToken = dto.pageToken
      }

      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.photos',
        'places.regularOpeningHours',
        'places.priceLevel',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.types',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'nextPageToken',
      ].join(',')

      const { data } = await this.axiosInstance.post<GoogleSearchResponseDto>('/places:searchText', requestBody, {
        headers: {
          'X-Goog-FieldMask': fieldMask,
        },
      })

      return {
        places: data.places || [],
        nextPageToken: data.nextPageToken,
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async getPlaceDetails(dto: PlaceDetailsDto): Promise<GooglePlaceDto> {
    try {
      const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'photos',
        'reviews',
        'reviewSummary',
        'generativeSummary',
        'regularOpeningHours',
        'priceLevel',
        'nationalPhoneNumber',
        'websiteUri',
        'types',
        'primaryType',
        'primaryTypeDisplayName',
      ].join(',')

      const { data } = await this.axiosInstance.get<GooglePlaceDto>(`/places/${dto.placeId}`, {
        headers: {
          'X-Goog-FieldMask': fieldMask,
        },
        params: {
          languageCode: 'ko',
        },
      })

      return data
    } catch (error) {
      this.handleError(error)
    }
  }

  getPhotoUrl(photoName: string, maxWidthPx = 400, maxHeightPx = 400): string {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${this.apiKey}`
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = (error.response?.data as { error?: { message?: string } })?.error?.message || error.message

      if (status === 400) throw new CustomException(ErrorType.BadRequest, `잘못된 요청입니다: ${message}`)
      else if (status === 401 || status === 403) throw new CustomException(ErrorType.Unauthorized, 'Google API 인증 실패')
      else if (status === 429) throw new CustomException(ErrorType.TooManyRequests, 'API 호출 한도 초과')
      else throw new CustomException(ErrorType.BadGateway, `Google API 호출 실패: ${message}`)
    }

    throw new CustomException(ErrorType.BadGateway, 'Google API 호출 중 오류 발생')
  }
}
