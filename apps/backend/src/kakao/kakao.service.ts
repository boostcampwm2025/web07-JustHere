// src/kakao/kakao.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KakaoLocalSearchResponse } from '@web07/types';

@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);
  private readonly restApiKey: string;

  constructor(private configService: ConfigService) {
    this.restApiKey = this.configService.get<string>(
      'KAKAO_REST_API_KEY',
    ) as string;
  }

  async searchLocal(
    query: string,
    x?: number,
    y?: number,
    radius?: number,
    page?: number,
  ): Promise<KakaoLocalSearchResponse> {
    // 혹시 이미 인코딩된 상태라면 디코딩
    const decodedQuery = decodeURIComponent(query);

    const params = new URLSearchParams({
      query: decodedQuery,
      ...(x && { x: String(x) }),
      ...(y && { y: String(y) }),
      ...(radius && { radius: String(radius) }),
      ...(page && { page: String(page) }),
    });

    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`;

    this.logger.log(`[Kakao API Call] URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${this.restApiKey}`,
        },
      });

      this.logger.log(`[Kakao API Response] Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[Kakao API Error] Status: ${response.status}, Body: ${errorText}`,
        );
        throw new HttpException('카카오 API 호출 실패', HttpStatus.BAD_REQUEST);
      }

      const result = (await response.json()) as KakaoLocalSearchResponse;
      this.logger.log(
        `[Kakao API Success] Documents count: ${result.documents?.length || 0}`,
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `[Kakao API Exception] ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw new HttpException(
        '카카오 API 호출 중 오류 발생',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
