import { apiClient } from '@/shared/api/client'

export interface RoomRegionPayload {
  x: number
  y: number
  place_name?: string
}

export interface RoomResponse {
  status: string
  statusCode: 200
  data: RoomData
  timestamp: string
}

export interface RoomData {
  id: string
  slug: string
  x: number
  y: number
  place_name?: string | null
  createdAt: string
  updatedAt: string
}

export const createRoom = async (payload: RoomRegionPayload): Promise<RoomData> => {
  const response = await apiClient.post<RoomResponse>('/api/room/create', payload)
  return response.data.data
}

export const updateRoom = async (slug: string, payload: RoomRegionPayload): Promise<RoomData> => {
  const response = await apiClient.patch<RoomResponse>(`/api/room/${slug}`, payload)
  return response.data.data
}

export interface VoteResultCandidate {
  placeId: string
  name: string
  address: string
  category?: string
  phone?: string
  imageUrl?: string
  rating?: number
  ratingCount?: number
  createdBy: string
  createdAt: string
}

export interface VoteResultItem {
  category: string
  result: VoteResultCandidate[]
}

interface VoteResultsResponse {
  status: string
  statusCode: number
  data: VoteResultItem[]
  timestamp: string
}

export const getVoteResults = async (roomId: string): Promise<VoteResultItem[]> => {
  const response = await apiClient.get<VoteResultsResponse>(`/api/vote/results/${roomId}`)
  return response.data.data
}
