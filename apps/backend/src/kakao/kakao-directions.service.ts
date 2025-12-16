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
      const duration = summary.duration; // 밀리초 단위
      const distance = summary.distance; // 미터

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

      const routeInfo = new RouteInfo();
      routeInfo.path = path;
      routeInfo.duration = Math.floor(duration / 1000); // 밀리초를 초로 변환
      routeInfo.distance = distance;
      routeInfo.transportMode = 'CAR';

      return routeInfo;
    } catch (error) {
      this.logger.error('Kakao Directions API error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get car route: ${errorMessage}`);
    }
  }
}
