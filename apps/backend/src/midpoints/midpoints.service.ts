import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Participant } from '@/participants/entities/participant.entity';
import { Room } from '@/rooms/entities/room.entity';
import { ParticipantsService } from '@/participants/participants.service';
import { OdsayService } from '@/odsay/odsay.service';
import { KakaoDirectionsService } from '@/kakao/kakao-directions.service';
import { KakaoPlacesService } from '@/kakao/kakao-places.service';
import { CalculateMidpointsResponseDto } from '@/midpoints/dto/calculate-midpoints-response.dto';
import { MidpointCandidateResponseDto } from '@/midpoints/dto/midpoint-candidate-response.dto';
import { RouteInfo } from '@/midpoints/dto/route-info.dto';
import { ParticipantResponseDto } from '@/participants/dto/participant-response.dto';
import * as crypto from 'crypto';

interface Candidate {
  id: number;
  name: string;
  lat: number;
  lng: number;
  subwayLines: string[];
  participantDurations: Array<{
    participantId: number;
    participantName: string;
    duration: number; // 분
    routeInfo: RouteInfo;
    path: Array<{ lat: number; lng: number }>;
  }>;
}

@Injectable()
export class MidpointsService {
  private readonly logger = new Logger(MidpointsService.name);
  // 메모리 캐시
  // 주의: routeCache는 저작권 문제로 메모리에만 저장하며, DB 저장 금지
  private readonly routeCache = new Map<string, RouteInfo>();
  // calculationCache는 routePolyline을 제외한 결과만 저장
  private readonly calculationCache = new Map<
    number,
    {
      participantsHash: string;
      result: CalculateMidpointsResponseDto;
      timestamp: number;
    }
  >();

  constructor(
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private participantsService: ParticipantsService,
    private odsayService: OdsayService,
    private kakaoDirectionsService: KakaoDirectionsService,
    private kakaoPlacesService: KakaoPlacesService,
  ) {}

  async calculateMidpoints(
    roomId: number,
  ): Promise<CalculateMidpointsResponseDto> {
    // 참여자 목록 조회
    const participants = await this.participantsService.findAll(roomId);
    if (participants.length < 2) {
      throw new NotFoundException(
        'At least 2 participants are required to calculate midpoints',
      );
    }

    // 캐시 확인
    const participantsHash = this.generateParticipantsHash(participants);
    const cached = this.calculationCache.get(roomId);
    if (
      cached &&
      cached.participantsHash === participantsHash &&
      Date.now() - cached.timestamp < 3600000
    ) {
      // 1시간 이내 캐시 유효
      this.logger.log(`Returning cached result for roomId: ${roomId}`);
      return cached.result;
    }

    // Bounding Box 계산
    const { centerLat, centerLng } = this.calculateBoundingBox(participants);

    // 후보 지점 생성 (지하철역 검색)
    const subwayStations = await this.kakaoPlacesService.searchSubwayStations(
      centerLat,
      centerLng,
      5000, // 반경 5km
      15, // 최대 15개
    );

    // 각 후보에 대해 이동 시간 계산
    const candidates: Candidate[] = [];
    let candidateId = 1;

    for (const station of subwayStations) {
      const participantDurations = await Promise.all(
        participants.map(async (participant) => {
          const cacheKey = `${participant.id}-${candidateId}`;
          let routeInfo = this.routeCache.get(cacheKey);

          if (!routeInfo) {
            // 이동 시간 계산

            if (participant.transportMode === 'PUBLIC_TRANSPORT') {
              routeInfo = await this.odsayService.searchPubTransPathT(
                participant.lng,
                participant.lat,
                station.lng,
                station.lat,
              );
            } else {
              routeInfo = await this.kakaoDirectionsService.getCarRoute(
                participant.lng,
                participant.lat,
                station.lng,
                station.lat,
              );
            }
            this.routeCache.set(cacheKey, routeInfo);
          }

          return {
            participantId: participant.id,
            participantName: participant.name,
            duration: Math.round(routeInfo.duration / 60), // 초를 분으로 변환
            routeInfo,
            path: routeInfo.path.map((p) => ({ lat: p.lat, lng: p.lng })),
          };
        }),
      );

      candidates.push({
        id: candidateId++,
        name: station.placeName,
        lat: station.lat,
        lng: station.lng,
        subwayLines: station.subwayLines,
        participantDurations,
      });
    }

    // 통계 계산 및 스코어링
    const candidatesWithStats: Array<
      Candidate & {
        averageDuration: number;
        timeDifference: number;
        score: number;
      }
    > = candidates.map((candidate) => {
      const durations = candidate.participantDurations.map((d) => d.duration);
      const averageDuration =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const timeDifference = maxDuration - minDuration;

      // 분산 계산: variance = Σ(time - averageTime)² / N
      const variance =
        durations.reduce(
          (sum, d) => sum + Math.pow(d - averageDuration, 2),
          0,
        ) / durations.length;

      // 표준편차 계산: stddev = √variance
      const stddev = Math.sqrt(variance);

      // 스코어 계산: score = 0.5 × averageTime + 0.3 × stddev + 0.2 × maxTime
      const score = 0.5 * averageDuration + 0.3 * stddev + 0.2 * maxDuration;

      return {
        ...candidate,
        averageDuration: Math.round(averageDuration),
        timeDifference: Math.round(timeDifference),
        score,
      };
    });

    // 정렬 (스코어 기준 오름차순)
    candidatesWithStats.sort((a, b) => a.score - b.score);

    // 후보 개수 제한 (최대 5개)
    const limitedCandidates = candidatesWithStats.slice(0, 5);

    // DTO 변환
    const response = plainToInstance(CalculateMidpointsResponseDto, {
      candidates: limitedCandidates.map((candidate) =>
        plainToInstance(MidpointCandidateResponseDto, {
          id: candidate.id,
          name: candidate.name,
          lat: candidate.lat,
          lng: candidate.lng,
          subwayLines: candidate.subwayLines,
          averageDuration: candidate.averageDuration,
          timeDifference: candidate.timeDifference,
          score: candidate.score,
          participantDurations: candidate.participantDurations.map((pd) => ({
            participantId: pd.participantId,
            participantName: pd.participantName,
            duration: pd.duration,
            path: pd.path, // 프로토타입용 경로 정보
          })),
        }),
      ),
      totalCount: limitedCandidates.length,
    });

    // 캐시 저장 (routePolyline은 저작권 문제로 캐시에 포함하지 않음)
    // routePolyline은 메모리 routeCache에만 저장되며, 필요시 별도 엔드포인트로 제공
    this.calculationCache.set(roomId, {
      participantsHash,
      result: response,
      timestamp: Date.now(),
    });

    return response;
  }

  private calculateBoundingBox(participants: ParticipantResponseDto[]): {
    centerLat: number;
    centerLng: number;
  } {
    const lats: number[] = participants.map(
      (p: ParticipantResponseDto) => p.lat,
    );
    const lngs: number[] = participants.map(
      (p: ParticipantResponseDto) => p.lng,
    );

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
    };
  }

  private generateParticipantsHash(
    participants: ParticipantResponseDto[],
  ): string {
    const data = participants
      .map(
        (p: ParticipantResponseDto) =>
          `${p.id}-${p.lat}-${p.lng}-${p.transportMode}`,
      )
      .sort()
      .join('|');
    return crypto.createHash('md5').update(data).digest('hex');
  }
}
