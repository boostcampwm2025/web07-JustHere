import { useState, useEffect, useRef, useMemo } from 'react'
import { useInfiniteSearchKeyword } from '@/hooks/kakao/useKakaoQueries'
import type { KakaoPlace } from '@/types/kakao'

const DEFAULT_PAGE_SIZE = 15
const DEFAULT_RADIUS = 2000

interface UseLocationSearchOptions {
  roomId: string
  radius?: number
  pageSize?: number
  onSearchComplete?: (results: KakaoPlace[]) => void
}

export function useLocationSearch({ roomId, radius = DEFAULT_RADIUS, pageSize = DEFAULT_PAGE_SIZE, onSearchComplete }: UseLocationSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isSuccess } = useInfiniteSearchKeyword({
    keyword: searchTerm,
    roomId,
    radius,
    size: pageSize,
  })

  const searchResults = useMemo(() => data?.pages ?? [], [data?.pages])

  // 지도뷰에 마커를 띄우기 위해 검색 완료 콜백 호출
  useEffect(() => {
    if (isSuccess && searchTerm) {
      onSearchComplete?.(searchResults)
    }
  }, [isSuccess, searchResults, searchTerm, onSearchComplete])

  // 무한 스크롤 감지 로직
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '120px' },
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSearch = () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchTerm('')
      return
    }
    setSearchTerm(trimmed)
  }

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value)
  }

  return {
    searchQuery,
    setSearchQuery: updateSearchQuery,
    searchResults,
    isLoading: isLoading && !!searchTerm,
    isFetchingMore: isFetchingNextPage,
    hasMore: hasNextPage ?? false,
    hasSearched: !!searchTerm,
    handleSearch,
    loadMoreRef,
  }
}
