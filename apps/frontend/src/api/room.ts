import axios from 'axios'

export interface CreateRoomRequest {
  x: number
  y: number
  place_name?: string
}

export interface CreateRoomResponse {
  id: string
  slug: string
  x: number
  y: number
  place_name?: string | null
  createdAt: string
  updatedAt: string
}

export const createRoom = async (payload: CreateRoomRequest): Promise<CreateRoomResponse> => {
  const response = await axios.post<CreateRoomResponse>('/api/room/create', payload)
  return response.data
}
