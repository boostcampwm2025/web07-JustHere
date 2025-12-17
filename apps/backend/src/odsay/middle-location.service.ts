import { Injectable } from '@nestjs/common';
import { KakaoService } from '@/kakao/kakao.service';
import { OdsayService } from './odsay.service';
import type {
  UserLocationInput,
  MiddleLocationResult,
  StationCandidate,
  UserToStationTime,
} from '@web07/types';

@Injectable()
export class MiddleLocationService {
  constructor(
    private kakaoService: KakaoService,
    private odsayService: OdsayService,
  ) {}

  async findMiddleLocations(
    users: UserLocationInput[],
  ): Promise<MiddleLocationResult[]> {
    if (users.length < 2) {
      throw new Error('최소 2명 이상의 사용자가 필요합니다.');
    }

    // 1. 중심 좌표 계산
    const centerX = users.reduce((sum, u) => sum + u.x, 0) / users.length;
    const centerY = users.reduce((sum, u) => sum + u.y, 0) / users.length;

    // 2. 중심 좌표 주변의 지하철역 검색
    const stationCandidates = await this.findNearbyStations(centerX, centerY);

    // 3. 각 역에 대해 모든 사용자의 소요시간 계산
    const results: MiddleLocationResult[] = [];

    for (const station of stationCandidates) {
      const userTimes: UserToStationTime[] = [];
      let totalTime = 0;
      let failed = false;

      for (const user of users) {
        try {
          let travelTime: number;

          if (user.transportationType === 'public_transit') {
            // 대중교통 경로 계산
            travelTime = await this.calculateTravelTime(
              user.x,
              user.y,
              station.x,
              station.y,
            );
          } else {
            // 자동차 경로 계산
            travelTime = await this.calculateCarTravelTime(
              user.x,
              user.y,
              station.x,
              station.y,
            );
          }

          userTimes.push({
            userName: user.name,
            travelTime,
          });

          totalTime += travelTime;
        } catch (error) {
          console.error(
            `경로 계산 실패: ${user.name} -> ${station.name}`,
            error,
          );
          failed = true;
          break;
        }
      }

      if (failed) continue;

      const averageTime = totalTime / users.length;
      const maxTime = Math.max(...userTimes.map((ut) => ut.travelTime));

      // 표준편차 계산
      const variance =
        userTimes.reduce((sum, ut) => {
          const diff = ut.travelTime - averageTime;
          return sum + diff * diff;
        }, 0) / users.length;

      const stdDev = Math.sqrt(variance);
      const fairnessScore = stdDev === 0 ? 100 : 1 / stdDev;

      results.push({
        station,
        userTimes,
        averageTime,
        maxTime,
        fairnessScore,
      });
    }

    // 4. 공평성 점수와 평균 시간을 기준으로 정렬
    results.sort((a, b) => {
      // 공평성 우선, 그 다음 평균 시간
      const fairnessDiff = b.fairnessScore - a.fairnessScore;
      if (Math.abs(fairnessDiff) > 0.01) return fairnessDiff;
      return a.averageTime - b.averageTime;
    });

    // 5. 상위 5개 반환
    return results.slice(0, 5);
  }

  private async findNearbyStations(
    x: number,
    y: number,
  ): Promise<StationCandidate[]> {
    const radius = 5000; // 5km

    // 지하철역 검색
    const subwayData = await this.kakaoService.searchLocal(
      '지하철역',
      x,
      y,
      radius,
    );

    const stations: StationCandidate[] = subwayData.documents.map((doc) => ({
      name: doc.place_name,
      x: parseFloat(doc.x),
      y: parseFloat(doc.y),
      category: '지하철역',
    }));

    // 최대 5개 역만 검색 (계산 시간 단축)
    return stations.slice(0, 5);
  }

  private async calculateTravelTime(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<number> {
    const routeData = await this.odsayService.searchTransitRoute(
      startX,
      startY,
      endX,
      endY,
    );

    if (!routeData.result?.path?.length) {
      throw new Error('경로를 찾을 수 없습니다.');
    }

    // 가장 빠른 경로의 소요시간 반환 (초 단위를 분 단위로 변환)
    return routeData.result.path[0].info.totalTime;
  }

  private async calculateCarTravelTime(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<number> {
    const directionData = await this.kakaoService.getDirections(
      startX,
      startY,
      endX,
      endY,
    );

    if (!directionData.routes?.length) {
      throw new Error('경로를 찾을 수 없습니다.');
    }

    // 가장 빠른 경로의 소요시간 반환 (초 단위를 분 단위로 변환)
    const durationInSeconds = directionData.routes[0].summary.duration;
    return Math.round(durationInSeconds / 60); // 초를 분으로 변환
  }
}
