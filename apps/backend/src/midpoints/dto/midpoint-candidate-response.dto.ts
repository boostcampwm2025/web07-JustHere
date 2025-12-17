import { Expose } from 'class-transformer';

/**
 * 참가자별 소요시간 정보
 * 주의: path는 프로토타입용으로만 사용하며, 실제 서비스에서는 별도 엔드포인트 사용 권장
 */
export class ParticipantDurationDto {
  @Expose()
  participantId: number;

  @Expose()
  participantName: string;

  @Expose()
  duration: number; // 분

  @Expose()
  path?: Array<{ lat: number; lng: number }>; // 경로 좌표 배열 (프로토타입용)
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
