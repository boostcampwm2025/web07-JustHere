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
        throw new Error('No route found');
      }

      // 첫 번째 경로 사용
      const path: PathDto = data.result.path[0];
      const totalTime = path.info.totalTime; // 초 단위
      const totalDistance = path.info.totalDistance; // 미터

      // 경로 좌표 추출
      const routePath: Position[] = [];
      if (path.subPath) {
        for (const subPath of path.subPath) {
          if (subPath.path) {
            // path는 좌표 문자열일 수 있음 (예: "126.123,37.456")
            const coordinates = this.parsePathCoordinates(subPath.path);
            routePath.push(...coordinates);
          }
        }
      }

      const routeInfo = new RouteInfo();
      routeInfo.path = routePath;
      routeInfo.duration = totalTime;
      routeInfo.distance = totalDistance;
      routeInfo.transportMode = 'PUBLIC_TRANSPORT';

      return routeInfo;
    } catch (error) {
      this.logger.error('ODsay API error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
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
