import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KakaoLocalSearchResponse,
  KakaoDirectionResponse,
  KakaoAddressSearchResponse,
} from '@web07/types';

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

  async getDirections(
    originX: number,
    originY: number,
    destinationX: number,
    destinationY: number,
  ): Promise<KakaoDirectionResponse> {
    const params = new URLSearchParams({
      origin: `${originX},${originY}`,
      destination: `${destinationX},${destinationY}`,
    });

    const url = `https://apis-navi.kakaomobility.com/v1/directions?${params}`;

    this.logger.log(
      `[Kakao Direction API Call] URL: ${url}, origin: ${originX},${originY}, destination: ${destinationX},${destinationY}`,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${this.restApiKey}`,
        },
      });

      this.logger.log(
        `[Kakao Direction API Response] Status: ${response.status}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[Kakao Direction API Error] Status: ${response.status}, Body: ${errorText}`,
        );
        throw new HttpException(
          `카카오 Direction API 호출 실패: ${errorText}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = (await response.json()) as KakaoDirectionResponse;
      this.logger.log(
        `[Kakao Direction API Success] Routes count: ${result.routes?.length || 0}`,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `[Kakao Direction API Exception] ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        `카카오 Direction API 호출 중 오류 발생: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchAddress(query: string): Promise<KakaoAddressSearchResponse> {
    const decodedQuery = decodeURIComponent(query);
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(decodedQuery)}`;

    this.logger.log(`[Kakao Address API Call] URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${this.restApiKey}`,
        },
      });

      this.logger.log(
        `[Kakao Address API Response] Status: ${response.status}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[Kakao Address API Error] Status: ${response.status}, Body: ${errorText}`,
        );
        throw new HttpException(
          '카카오 주소 검색 실패',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `[Kakao Address API Exception] ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw new HttpException(
        '카카오 주소 검색 중 오류 발생',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
