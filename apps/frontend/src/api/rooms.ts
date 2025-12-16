import { apiClient } from "@/api/client";

export interface RoomResponse {
  id: number;
  createdAt: string;
}

export const createRoom = async (): Promise<RoomResponse> => {
  const response = await apiClient.post<RoomResponse>("/rooms", {});
  return response.data;
};
