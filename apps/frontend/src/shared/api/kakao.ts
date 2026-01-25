import axios from 'axios'
import type { KakaoPlace, KakaoMeta } from '@/shared/types'

export type SearchKeywordParams = {
  keyword: string
  roomId?: string
  radius?: number
  page?: number
  size?: number
}

export type KakaoKeywordResponseData = {
  documents: KakaoPlace[]
  meta: KakaoMeta
}

type KakaoKeywordResponse = {
  status: string
  statusCode: 200
  data: KakaoKeywordResponseData
  timestamp: string
}

export const searchKeyword = async (params: string | SearchKeywordParams): Promise<KakaoKeywordResponseData> => {
  const queryParams = typeof params === 'string' ? { keyword: params } : params
  const response = await axios.get<KakaoKeywordResponse>('/api/kakao/keyword', {
    params: queryParams,
  })
  return response.data.data
}
