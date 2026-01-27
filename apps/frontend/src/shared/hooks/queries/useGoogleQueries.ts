import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { searchText, getPlaceDetails, type SearchTextParams } from '@/shared/api/google'

export const googleKeys = {
  search: (params: SearchTextParams) => ['google', 'search', params] as const,
  searchInfinite: (params: Omit<SearchTextParams, 'pageToken'>) => ['google', 'search', 'infinite', params] as const,
  placeDetails: (placeId: string) => ['google', 'place', placeId] as const,
}

export const useGoogleSearch = (params: SearchTextParams) => {
  return useQuery({
    queryKey: googleKeys.search(params),
    queryFn: () => searchText(params),
    enabled: !!params.textQuery,
  })
}

export const useInfiniteGoogleSearch = (params: Omit<SearchTextParams, 'pageToken'>) => {
  const { textQuery, roomId, radius, maxResultCount } = params

  return useInfiniteQuery({
    queryKey: googleKeys.searchInfinite(params),
    queryFn: ({ pageParam }) =>
      searchText({
        textQuery,
        roomId,
        radius,
        maxResultCount,
        pageToken: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextPageToken,
    enabled: !!textQuery,
    select: data => ({
      pages: data.pages.flatMap(page => page.places),
      pageParams: data.pageParams,
    }),
  })
}

export const useGooglePlaceDetails = (placeId: string) => {
  return useQuery({
    queryKey: googleKeys.placeDetails(placeId),
    queryFn: () => getPlaceDetails(placeId),
    enabled: !!placeId,
  })
}
