import axios from 'axios'

export interface CreateRoomRequest {
  x: number
  y: number
  place_name?: string
}

export interface CreateRoomResponse {
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

export const createRoom = async (payload: CreateRoomRequest): Promise<RoomData> => {
  const response = await axios.post<CreateRoomResponse>('/api/room/create', payload)
  return response.data.data
}
