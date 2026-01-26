import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { searchKeyword, type SearchKeywordParams } from '@/shared/api/kakao'

export const kakaoKeys = {
  keyword: (params: string | SearchKeywordParams) => ['kakao', 'keyword', params] as const,
  infinity: (params: SearchKeywordParams) => ['kakao', 'infinity', params] as const,
}

export const useSearchKeyword = (params: string) => {
  const queryKey = kakaoKeys.keyword(params)

  return useQuery({
    queryKey,
    queryFn: () => searchKeyword(params),
    enabled: !!params,
  })
}

export const useInfiniteSearchKeyword = (params: SearchKeywordParams) => {
  const { keyword, roomId, radius, size } = params

  return useInfiniteQuery({
    queryKey: kakaoKeys.infinity(params),
    queryFn: ({ pageParam = 1 }) =>
      searchKeyword({
        keyword,
        roomId,
        radius,
        page: pageParam,
        size,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.meta.is_end) {
        return undefined
      }
      return allPages.length + 1
    },
    enabled: !!keyword,
    select: data => ({
      pages: data.pages.flatMap(page => page.documents),
      pageParams: data.pageParams,
    }),
  })
}
