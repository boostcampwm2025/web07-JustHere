import { Expose } from 'class-transformer';

/**
 * 참가자별 소요시간 정보
 * 주의: routePolyline은 저작권 문제로 DB 저장 및 응답에 포함하지 않음
 * 경로 정보가 필요한 경우 별도 엔드포인트(GET /api/rooms/:roomId/midpoints/:candidateId/routes/:participantId) 사용
 */
export class ParticipantDurationDto {
  @Expose()
  participantId: number;

  @Expose()
  participantName: string;

  @Expose()
  duration: number; // 분
}

export class MidpointCandidateResponseDto {
  @Expose()
  id: number; // 후보 ID

  @Expose()
  name: string; // 위치 이름 (예: "양재역")

  @Expose()
  lat: number; // 위도

  @Expose()
  lng: number; // 경도

  @Expose()
  subwayLines: string[]; // 지하철 노선 (예: ["3호선", "신분당선"])

  @Expose()
  averageDuration: number; // 평균 소요시간 (분)

  @Expose()
  timeDifference: number; // 시간 차이 (분)

  @Expose()
  score: number; // 스코어 (낮을수록 좋음)

  @Expose()
  participantDurations: ParticipantDurationDto[];
}
