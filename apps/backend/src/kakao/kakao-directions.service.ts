import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RouteInfo, Position } from '@/midpoints/dto/route-info.dto';
import {
  KakaoDirectionsResponseDto,
  RouteDto,
} from '@/kakao/dto/kakao-directions-response.dto';

@Injectable()
export class KakaoDirectionsService {
  private readonly logger = new Logger(KakaoDirectionsService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl =
    'https://apis-navi.kakaomobility.com/v1/directions';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('KAKAO_REST_API_KEY');

    if (!this.apiKey) {
      this.logger.warn('KAKAO_REST_API_KEY가 없습니다.');
    }
  }

  async getCarRoute(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<RouteInfo> {
    if (!this.apiKey) {
      throw new Error('KAKAO_REST_API_KEY is not set');
    }

    try {
      // HttpService를 사용하여 타입 안전하게 API 호출
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            origin: `${startX},${startY}`,
            destination: `${endX},${endY}`,
          },
          headers: {
            Authorization: `KakaoAK ${this.apiKey}`,
          },
        }),
      );

      // class-transformer로 응답 데이터 변환 및 검증
      const data = plainToInstance(KakaoDirectionsResponseDto, response.data, {
        excludeExtraneousValues: true,
      });

      // class-validator로 데이터 검증
      const errors = await validate(data);
      if (errors.length > 0) {
        this.logger.error(
          'Kakao Directions API response validation failed:',
          errors,
        );
        throw new Error('Invalid response format from Kakao Directions API');
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      // 첫 번째 경로 사용
      const route: RouteDto = data.routes[0];
      const summary = route.summary;

      if (!summary) {
        this.logger.error('Route summary is missing', {
          route: JSON.stringify(route),
        });
        throw new Error('Route summary is missing');
      }

      const duration = summary.duration; // 초 단위
      const distance = summary.distance; // 미터

      this.logger.debug('Car route duration', {
        duration,
        distance,
        durationInSeconds: duration,
        durationInMinutes: Math.floor(duration / 60),
      });

      if (!duration || duration === 0) {
        this.logger.warn('Duration is 0 or missing', {
          summary: JSON.stringify(summary),
          route: JSON.stringify(route),
        });
      }

      // 경로 path 추출 (카카오 Directions API의 경로 path)
      // sections에서 경로 좌표 추출
      const path: Position[] = [];
      if (route.sections) {
        for (const section of route.sections) {
          if (section.roads) {
            for (const road of section.roads) {
              if (road.vertexes && road.vertexes.length > 0) {
                // vertexes는 [lng, lat, lng, lat, ...] 형식
                for (let i = 0; i < road.vertexes.length; i += 2) {
                  if (i + 1 < road.vertexes.length) {
                    const position = new Position();
                    position.lng = road.vertexes[i];
                    position.lat = road.vertexes[i + 1];
                    path.push(position);
                  }
                }
              }
            }
          }
        }
      }

      // 경로가 없으면 시작점과 끝점만 포함
      if (path.length === 0) {
        path.push({ lat: startY, lng: startX }, { lat: endY, lng: endX });
      }

      const routeInfo = new RouteInfo();
      routeInfo.path = path;
      routeInfo.duration = duration; // 이미 초 단위
      routeInfo.distance = distance;
      routeInfo.transportMode = 'CAR';

      return routeInfo;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        const status = axiosError.response?.status;
        const message =
          axiosError.response?.data?.message || axiosError.message;
        this.logger.error(
          `Kakao Directions API error: ${status || 'unknown'} - ${message || 'Unknown error'}`,
        );
        throw new Error(
          `Failed to get car route: ${status ? `HTTP ${status}` : message || 'Unknown error'}`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Kakao Directions API error: ${errorMessage}`);
      throw new Error(`Failed to get car route: ${errorMessage}`);
    }
  }
}
