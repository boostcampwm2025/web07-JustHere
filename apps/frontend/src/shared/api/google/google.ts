import type { GooglePlace, GoogleSearchResponse } from '@/shared/types'
import { apiClient } from '@/shared/api/client'

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

type GooglePhotoApiResponse = {
  status: string
  statusCode: 200
  data: {
    photoUri: string
  }
  timestamp: string
}

export const searchText = async (params: SearchTextParams): Promise<GoogleSearchResponse> => {
  const response = await apiClient.post<GoogleSearchApiResponse>('/api/google/search', params)
  return response.data.data
}

export const getPlaceDetails = async (placeId: string): Promise<GooglePlace> => {
  const response = await apiClient.get<GooglePlaceApiResponse>(`/api/google/places/${placeId}`)
  return response.data.data
}

export const getPhotoUrl = async (photoName: string, maxWidthPx = 400, maxHeightPx = 400): Promise<string> => {
  const response = await apiClient.get<GooglePhotoApiResponse>(`/api/google/photos/${photoName}`, {
    params: {
      maxWidthPx,
      maxHeightPx,
    },
  })
  return response.data.data.photoUri
}
