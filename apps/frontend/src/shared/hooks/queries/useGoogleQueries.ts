import { useQuery, useInfiniteQuery, useQueries } from '@tanstack/react-query'
import { searchText, getPlaceDetails, getPhotoUrl, type SearchTextParams } from '@/shared/api/google'

export const googleKeys = {
  search: (params: SearchTextParams) => ['google', 'search', params] as const,
  searchInfinite: (params: Omit<SearchTextParams, 'pageToken'>) => ['google', 'search', 'infinite', params] as const,
  placeDetails: (placeId: string) => ['google', 'place', placeId] as const,
  photo: (photoName: string, maxWidthPx: number, maxHeightPx: number) => ['google', 'photo', photoName, maxWidthPx, maxHeightPx] as const,
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
    staleTime: 0,
    gcTime: 0,
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

export const useGooglePhotos = (photoNames: (string | undefined | null)[], maxWidthPx = 400, maxHeightPx = 400) => {
  return useQueries({
    queries: photoNames.map(name => ({
      queryKey: googleKeys.photo(name!, maxWidthPx, maxHeightPx),
      queryFn: () => getPhotoUrl(name!, maxWidthPx, maxHeightPx),
      enabled: !!name,
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60, // Cache for 1 hour
    })),
  })
}
