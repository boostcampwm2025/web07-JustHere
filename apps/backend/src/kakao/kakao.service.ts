import {
  Injectable,
  HttpException,
  HttpStatus,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SearchKeywordDto } from './dto/search-keyword.dto';
import { KakaoLocalSearchResponse } from './dto/kakao-api.dto';

@Injectable()
export class KakaoService {
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('KAKAO_REST_API_KEY');
    const baseURL = this.configService.get<string>('KAKAO_API_BASE_URL');

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 5000,
      headers: {
        Authorization: `KakaoAK ${this.apiKey}`,
      },
    });
  }

  async searchByKeyword(
    dto: SearchKeywordDto,
  ): Promise<KakaoLocalSearchResponse> {
    try {
      const { data } = await this.axiosInstance.get<KakaoLocalSearchResponse>(
        '/v2/local/search/keyword.json',
        {
          params: {
            query: dto.keyword,
            x: dto.x,
            y: dto.y,
            radius: dto.radius,
            page: dto.page,
            size: dto.size,
          },
        },
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        // Kakao API 에러 상태 코드별 처리
        if (status === 400) {
          throw new HttpException(
            `잘못된 요청입니다: ${message}`,
            HttpStatus.BAD_REQUEST,
          );
        } else if (status === 401) {
          throw new HttpException(
            'Kakao API 인증 실패',
            HttpStatus.UNAUTHORIZED,
          );
        } else if (status === 429) {
          throw new HttpException(
            'API 호출 한도 초과',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          throw new BadGatewayException(`Kakao API 호출 실패: ${message}`);
        }
      }

      throw new BadGatewayException('Kakao API 호출 중 오류 발생');
    }
  }
}
