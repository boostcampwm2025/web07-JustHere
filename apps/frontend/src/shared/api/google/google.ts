import axios from 'axios'
import type { GooglePlace, GoogleSearchResponse } from '@/shared/types'

export type SearchTextParams = {
  textQuery: string
  roomId?: string
  radius?: number
  maxResultCount?: number
  pageToken?: string
}

type GoogleSearchApiResponse = {
  status: string
  statusCode: 200
  data: GoogleSearchResponse
  timestamp: string
}

type GooglePlaceApiResponse = {
  status: string
  statusCode: 200
  data: GooglePlace
  timestamp: string
}

export const searchText = async (params: SearchTextParams): Promise<GoogleSearchResponse> => {
  const response = await axios.post<GoogleSearchApiResponse>('/api/google/search', params)
  return response.data.data
}

export const getPlaceDetails = async (placeId: string): Promise<GooglePlace> => {
  const response = await axios.get<GooglePlaceApiResponse>(`/api/google/places/${placeId}`)
  return response.data.data
}

export const getPhotoUrl = (photoName: string, maxWidthPx = 400, maxHeightPx = 400): string => {
  return `/api/google/photos/${photoName}?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}`
}
