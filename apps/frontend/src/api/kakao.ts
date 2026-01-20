import axios from 'axios'
import type { KakaoPlace } from '@/types/kakao'

export type SearchKeywordParams = {
  keyword: string
  roomId?: string
  radius?: number
}

type KakaoKeywordResponse = {
  status: string
  statusCode: 200
  data: {
    documents: KakaoPlace[]
  }
  timestamp: string
}

export const searchKeyword = async (params: string | SearchKeywordParams): Promise<KakaoPlace[]> => {
  const queryParams = typeof params === 'string' ? { keyword: params } : params
  const response = await axios.get<KakaoKeywordResponse>('/api/kakao/keyword', {
    params: queryParams,
  })
  return response.data.data.documents ?? []
}
