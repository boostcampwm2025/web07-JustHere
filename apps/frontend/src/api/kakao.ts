import axios from 'axios'
import type { KakaoPlace } from '@/types/kakao'

type KakaoKeywordResponse = {
  documents: KakaoPlace[]
}

export const searchKeyword = async (keyword: string): Promise<KakaoPlace[]> => {
  const response = await axios.get<KakaoKeywordResponse>('/api/kakao/keyword', {
    params: { keyword },
  })
  return response.data.documents ?? []
}
