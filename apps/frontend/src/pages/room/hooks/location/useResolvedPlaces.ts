import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { GooglePlace } from '@/shared/types'
import { getPlaceDetails } from '@/shared/api'
import { googleKeys } from '@/shared/hooks/queries/useGoogleQueries'

export function useResolvedPlaces(placeIds: string[]) {
  // placeIds에 대해 useQueries로 병렬 쿼리 수행
  // - 캐시에 데이터가 있으면 API 호출 없이 즉시 반환 (staleTime 설정에 따름)
  // - 없으면 getPlaceDetails로 자동 fetch
  const queries = useQueries({
    queries: placeIds.map(placeId => ({
      queryKey: googleKeys.placeDetails(placeId),
      queryFn: () => getPlaceDetails(placeId),
      staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
      gcTime: 1000 * 60 * 30, // 30분 후 가비지 컬렉션
      enabled: !!placeId,
    })),
  })

  // 로딩이 완료된 성공적인 데이터만 필터링해서 반환
  // 순서는 placeIds 순서를 유지하기 위해 queries 순서대로 매핑
  const resolvedPlaces = useMemo(() => {
    return queries.map(query => query.data).filter((place): place is GooglePlace => !!place)
  }, [queries])

  return resolvedPlaces
}
