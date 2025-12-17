import { apiClient } from "@/api/client";

export interface ParticipantDuration {
  participantId: number;
  participantName: string;
  duration: number; // 분
  path?: Array<{ lat: number; lng: number }>; // 경로 좌표 배열
}

export interface MidpointCandidate {
  id: number;
  name: string;
  lat: number;
  lng: number;
  subwayLines: string[];
  averageDuration: number; // 분
  timeDifference: number; // 분
  score: number;
  participantDurations: ParticipantDuration[];
}

export interface CalculateMidpointsResponse {
  candidates: MidpointCandidate[];
  totalCount: number;
}

export const calculateMidpoints = async (
  roomId: number
): Promise<CalculateMidpointsResponse> => {
  const response = await apiClient.post<CalculateMidpointsResponse>(
    `/rooms/${roomId}/midpoints/calculate`
  );
  return response.data;
};
