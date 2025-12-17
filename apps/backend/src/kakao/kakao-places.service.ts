import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  KakaoPlacesResponseDto,
  KakaoPlaceDocumentDto,
} from '@/kakao/dto/kakao-places-response.dto';

export interface SubwayStation {
  id: string;
  placeName: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
  subwayLines: string[];
}

export interface AddressSearchResult {
  address_name: string;
  road_address_name?: string;
  lat: number;
  lng: number;
}

@Injectable()
export class KakaoPlacesService {
  private readonly logger = new Logger(KakaoPlacesService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl =
    'https://dapi.kakao.com/v2/local/search/keyword.json';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('KAKAO_REST_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('KAKAO_REST_API_KEY is not set');
    }
  }

  async searchSubwayStations(
    centerLat: number,
    centerLng: number,
    radius: number = 5000, // 미터 단위, 기본 5km
    size: number = 15, // 최대 검색 개수
  ): Promise<SubwayStation[]> {
    if (!this.apiKey) {
      throw new Error('KAKAO_REST_API_KEY is not set');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            query: '지하철역',
            x: centerLng,
            y: centerLat,
            radius,
            size,
            sort: 'distance', // 거리순 정렬
          },
          headers: {
            Authorization: `KakaoAK ${this.apiKey}`,
          },
        }),
      );

      // class-transformer로 응답 데이터 변환
      const data = plainToInstance(KakaoPlacesResponseDto, response.data, {
        excludeExtraneousValues: true,
      });

      // class-validator로 데이터 검증
      const errors = await validate(data);
      if (errors.length > 0) {
        this.logger.error(
          'Kakao Places API response validation failed:',
          errors,
        );
        throw new Error('Invalid response format from Kakao Places API');
      }

      const documents = data.documents || [];
      return documents.map((doc: KakaoPlaceDocumentDto) => {
        // 카테고리명에서 지하철 노선 정보 추출
        const subwayLines: string[] = [];
        if (doc.category_name) {
          // category_name 예: "지하철역 > 2호선", "지하철역 > 3호선"
          const match = doc.category_name.match(/(\d+호선)/g);
          if (match) {
            subwayLines.push(...match);
          }
        }

        return {
          id: doc.id,
          placeName: doc.place_name,
          addressName: doc.address_name,
          roadAddressName: doc.road_address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          subwayLines,
        };
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
            config?: { url?: string; params?: unknown; method?: string };
          };
          message?: string;
          config?: { url?: string; params?: unknown; method?: string };
        };
        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;

        this.logger.error('Kakao Places API error:', {
          status,
          statusText,
          message: axiosError.message,
        });
        throw new Error(
          `Failed to search subway stations: ${status ? `HTTP ${status} ${statusText || ''}` : axiosError.message || 'Unknown error'}`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Kakao Places API error:', {
        message: errorMessage,
      });
      throw new Error(`Failed to search subway stations: ${errorMessage}`);
    }
  }

  async searchAddresses(query: string): Promise<AddressSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('KAKAO_REST_API_KEY is not set');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            query,
            size: 10, // 최대 10개 결과
          },
          headers: {
            Authorization: `KakaoAK ${this.apiKey}`,
          },
        }),
      );

      // class-transformer로 응답 데이터 변환
      const data = plainToInstance(KakaoPlacesResponseDto, response.data, {
        excludeExtraneousValues: true,
      });

      // class-validator로 데이터 검증
      const errors = await validate(data);
      if (errors.length > 0) {
        this.logger.error(
          'Kakao Places API response validation failed:',
          errors,
        );
        throw new Error('Invalid response format from Kakao Places API');
      }

      const documents = data.documents || [];
      // 도로명 주소가 있는 결과만 필터링
      return documents
        .filter((doc: KakaoPlaceDocumentDto) => doc.road_address_name)
        .map((doc: KakaoPlaceDocumentDto) => ({
          address_name: doc.address_name,
          road_address_name: doc.road_address_name,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        }));
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
            config?: { url?: string; params?: unknown; method?: string };
          };
          message?: string;
          config?: { url?: string; params?: unknown; method?: string };
        };
        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;

        this.logger.error('Kakao Places API error:', {
          status,
          statusText,
          message: axiosError.message,
        });
        throw new Error(
          `Failed to search addresses: ${status ? `HTTP ${status} ${statusText || ''}` : axiosError.message || 'Unknown error'}`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Kakao Places API error:', {
        message: errorMessage,
      });
      throw new Error(`Failed to search addresses: ${errorMessage}`);
    }
  }
}
