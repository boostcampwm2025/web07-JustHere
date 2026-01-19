import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { SearchKeywordDto } from './dto/search-keyword.dto'
import { KakaoLocalSearchResponse } from './dto/kakao-api.dto'

@Injectable()
export class KakaoService {
  private readonly axiosInstance: AxiosInstance
  private readonly apiKey: string

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('KAKAO_REST_API_KEY')
    const baseURL = this.configService.get<string>('KAKAO_API_BASE_URL')

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        Authorization: `KakaoAK ${this.apiKey}`,
      },
    })
  }

  async searchByKeyword(dto: SearchKeywordDto): Promise<KakaoLocalSearchResponse> {
    try {
      const { data } = await this.axiosInstance.get<KakaoLocalSearchResponse>('/v2/local/search/keyword.json', {
        params: {
          query: dto.keyword,
          x: dto.x,
          y: dto.y,
          radius: dto.radius,
          page: dto.page,
          size: dto.size,
        },
      })

      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const message = (error.response?.data as { message?: string })?.message || error.message

        // Kakao API 에러 상태 코드별 처리
        if (status === 400) throw new CustomException(ErrorType.BadRequest, `잘못된 요청입니다: ${message}`)
        else if (status === 401) throw new CustomException(ErrorType.Unauthorized, 'Kakao API 인증 실패')
        else if (status === 429) throw new CustomException(ErrorType.TooManyRequests, 'API 호출 한도 초과')
        else throw new CustomException(ErrorType.BadGateway, `Kakao API 호출 실패: ${message}`)
      }

      throw new CustomException(ErrorType.BadGateway, 'Kakao API 호출 중 오류 발생')
    }
  }
}
