import { useEffect, useRef, useState } from 'react'
import type { GooglePlace } from '@/shared/types'
import { getPlaceDetails } from '@/shared/api'

export function useResolvedPlaces(placeIds: string[], additionalPlaces: GooglePlace[] = []) {
  const [resolvedPlaces, setResolvedPlaces] = useState<GooglePlace[]>([])
  const placeCacheRef = useRef<Record<string, GooglePlace>>({})

  // 검색 결과 등으로 들어온 장소들을 캐시에 추가
  useEffect(() => {
    if (additionalPlaces.length === 0) return

    const nextCache = { ...placeCacheRef.current }
    let isUpdated = false

    for (const place of additionalPlaces) {
      if (!nextCache[place.id]) {
        isUpdated = true
      }
      nextCache[place.id] = place
    }

    if (isUpdated) {
      placeCacheRef.current = nextCache
    }
  }, [additionalPlaces])

  // placeIds에 해당하는 장소 정보 조회 (캐시 우선, 없으면 API 호출)
  useEffect(() => {
    let cancelled = false

    const resolvePlaces = async () => {
      if (placeIds.length === 0) {
        if (!cancelled) {
          setResolvedPlaces([])
        }
        return
      }

      const cache = placeCacheRef.current
      const cachedPlaces: GooglePlace[] = []
      const missingIds: string[] = []

      for (const placeId of placeIds) {
        const cached = cache[placeId]
        if (cached) {
          cachedPlaces.push(cached)
        } else {
          missingIds.push(placeId)
        }
      }

      let fetchedPlaces: GooglePlace[] = []
      if (missingIds.length > 0) {
        const results = await Promise.all(
          missingIds.map(async placeId => {
            try {
              return await getPlaceDetails(placeId)
            } catch {
              return null
            }
          }),
        )
        fetchedPlaces = results.filter(Boolean) as GooglePlace[]

        if (fetchedPlaces.length > 0) {
          const nextCache = { ...placeCacheRef.current }
          for (const place of fetchedPlaces) {
            nextCache[place.id] = place
          }
          placeCacheRef.current = nextCache
        }
      }

      if (cancelled) return

      const placeMap = new Map<string, GooglePlace>()
      for (const place of [...cachedPlaces, ...fetchedPlaces]) {
        placeMap.set(place.id, place)
      }

      const orderedPlaces = placeIds.map(placeId => placeMap.get(placeId)).filter(Boolean) as GooglePlace[]
      setResolvedPlaces(orderedPlaces)
    }

    resolvePlaces()

    return () => {
      cancelled = true
    }
  }, [placeIds]) // additionalPlaces 변경 시에는 resolve 다시 안 함 (캐시만 업데이트)

  return resolvedPlaces
}
