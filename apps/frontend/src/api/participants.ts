import { apiClient } from "@/api/client";

export interface CreateParticipantRequest {
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
}

export interface ParticipantResponse {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  transportMode: "CAR" | "PUBLIC_TRANSPORT";
  createdAt: string;
}

export const createParticipant = async (
  roomId: number,
  data: CreateParticipantRequest
): Promise<ParticipantResponse> => {
  const response = await apiClient.post<ParticipantResponse>(
    `/rooms/${roomId}/participants`,
    data
  );
  return response.data;
};

export const getParticipants = async (
  roomId: number
): Promise<ParticipantResponse[]> => {
  const response = await apiClient.get<ParticipantResponse[]>(
    `/rooms/${roomId}/participants`
  );
  return response.data;
};
