import axios from 'axios'

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
  const response = await axios.post<RoomResponse>('/api/room/create', payload)
  return response.data.data
}

export const updateRoom = async (payload: RoomRegionPayload): Promise<RoomData> => {
  const response = await axios.patch<RoomResponse>('/api/room/${slug}', payload)
  return response.data.data
}
