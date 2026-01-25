import { useQuery } from '@tanstack/react-query'
import { searchKeyword, type SearchKeywordParams } from '@/api/kakao'

export const kakaoKeys = {
  keyword: (params: string | SearchKeywordParams) => ['kakao', params, 'keyword'] as const,
}

export const useSearchKeyword = (params: string | SearchKeywordParams) => {
  const queryKey = kakaoKeys.keyword(params)
  const keyword = typeof params === 'string' ? params : params.keyword

  return useQuery({
    queryKey,
    queryFn: () => searchKeyword(params),
    enabled: !!keyword,
  })
}
