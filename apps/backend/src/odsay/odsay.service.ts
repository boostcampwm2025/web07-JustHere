import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RouteInfo, Position } from '@/midpoints/dto/route-info.dto';
import { OdsayResponseDto, PathDto } from '@/odsay/dto/odsay-response.dto';

@Injectable()
export class OdsayService {
  private readonly logger = new Logger(OdsayService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.odsay.com/v1/api';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ODSAY_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('ODSAY_API_KEY is not set');
    }
  }

  async searchPubTransPathT(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<RouteInfo> {
    if (!this.apiKey) {
      throw new Error('ODSAY_API_KEY is not set');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/searchPubTransPathT`, {
        params: {
          apiKey: this.apiKey,
          SX: startX,
          SY: startY,
          EX: endX,
          EY: endY,
          OPT: 0, // 최적 경로
        },
      });

      // class-transformer로 응답 데이터 변환
      const data = plainToInstance(OdsayResponseDto, response.data, {
        excludeExtraneousValues: true,
      });

      // class-validator로 데이터 검증
      const errors = await validate(data);
      if (errors.length > 0) {
        this.logger.error('ODsay API response validation failed:', errors);
        throw new Error('Invalid response format from ODsay API');
      }

      if (!data.result || !data.result.path || data.result.path.length === 0) {
        // 프로토타입: 경로를 찾을 수 없는 경우 기본값 반환
        this.logger.warn('No route found, returning default route info');
        const defaultRouteInfo = new RouteInfo();
        defaultRouteInfo.path = [
          { lat: startY, lng: startX },
          { lat: endY, lng: endX },
        ];
        // 직선 거리 기반 추정 시간 (시속 30km/h 가정)
        const distance =
          Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) *
          111000; // 위경도 차이를 미터로 변환 (대략)
        defaultRouteInfo.distance = Math.round(distance);
        defaultRouteInfo.duration = Math.round((distance / 1000 / 30) * 3600); // 초 단위
        defaultRouteInfo.transportMode = 'PUBLIC_TRANSPORT';
        return defaultRouteInfo;
      }

      // 첫 번째 경로 사용
      const path: PathDto = data.result.path[0];
      const totalTime = path.info.totalTime; // 초 단위
      const totalDistance = path.info.totalDistance; // 미터

      // 경로 좌표 추출
      const routePath: Position[] = [];

      if (path.subPath && path.subPath.length > 0) {
        for (let i = 0; i < path.subPath.length; i++) {
          const subPath = path.subPath[i];

          // 1. passStopList.stations에서 경로 좌표 추출 (대중교통 경로)
          if (
            subPath.passStopList?.stations &&
            subPath.passStopList.stations.length > 0
          ) {
            const stations = subPath.passStopList.stations;
            for (const station of stations) {
              if (station.x && station.y) {
                routePath.push({ lat: station.y, lng: station.x });
              }
            }
          }
          // 2. path 필드에서 경로 좌표 추출 (도보 경로 등)
          if (subPath.path) {
            // path는 좌표 문자열일 수 있음 (예: "126.123,37.456|126.124,37.457")
            const coordinates = this.parsePathCoordinates(subPath.path);
            if (coordinates.length > 0) {
              routePath.push(...coordinates);
            }
          }
        }
      }

      // 경로가 없으면 시작점과 끝점만 추가
      if (routePath.length === 0) {
        routePath.push({ lat: startY, lng: startX });
        routePath.push({ lat: endY, lng: endX });
      } else {
        // 시작점이 경로에 없으면 추가
        const firstPoint = routePath[0];
        if (
          Math.abs(firstPoint.lat - startY) > 0.001 ||
          Math.abs(firstPoint.lng - startX) > 0.001
        ) {
          routePath.unshift({ lat: startY, lng: startX });
        }
        // 끝점이 경로에 없으면 추가
        const lastPoint = routePath[routePath.length - 1];
        if (
          Math.abs(lastPoint.lat - endY) > 0.001 ||
          Math.abs(lastPoint.lng - endX) > 0.001
        ) {
          routePath.push({ lat: endY, lng: endX });
        }
      }

      const routeInfo = new RouteInfo();
      routeInfo.path = routePath;
      routeInfo.duration = totalTime;
      routeInfo.distance = totalDistance;
      routeInfo.transportMode = 'PUBLIC_TRANSPORT';

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
          `ODsay API error: ${status || 'unknown'} - ${message || 'Unknown error'}`,
        );
        throw new Error(
          `Failed to get public transport route: ${status ? `HTTP ${status}` : message || 'Unknown error'}`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`ODsay API error: ${errorMessage}`);
      throw new Error(`Failed to get public transport route: ${errorMessage}`);
    }
  }

  private parsePathCoordinates(
    path: string | Array<{ x: number; y: number }>,
  ): Position[] {
    if (Array.isArray(path)) {
      return path.map((coord) => {
        const position = new Position();
        position.lat = coord.y;
        position.lng = coord.x;
        return position;
      });
    }

    // 문자열 형식인 경우 파싱 (예: "126.123,37.456|126.124,37.457")
    if (typeof path === 'string') {
      return path.split('|').map((coord) => {
        const [lng, lat] = coord.split(',').map(Number);
        const position = new Position();
        position.lng = lng;
        position.lat = lat;
        return position;
      });
    }

    return [];
  }
}
