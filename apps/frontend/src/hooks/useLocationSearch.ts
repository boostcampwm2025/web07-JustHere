import { useState, useCallback, useEffect, useRef } from 'react'
import { searchKeyword } from '@/api/kakao'
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
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isFetchingMoreRef = useRef(false)
  // 최신 요청만 반영하기 위한 요청 식별자
  const requestIdRef = useRef(0)

  // 검색어 비움 시 상태 초기화 + 진행 중 요청 무효화
  const resetAndInvalidate = useCallback(() => {
    requestIdRef.current += 1
    isFetchingMoreRef.current = false
    setSearchResults([])
    setPage(1)
    setHasMore(false)
    setIsLoading(false)
    setIsFetchingMore(false)
  }, [])

  const updateSearchQuery = useCallback(
    (value: string) => {
      setSearchQuery(value)
      // 빈 검색어면 즉시 결과를 비우고 요청을 무효화
      if (!value.trim()) {
        resetAndInvalidate()
      }
    },
    [resetAndInvalidate],
  )

  const fetchSearchResults = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      const trimmedQuery = searchQuery.trim()
      if (!trimmedQuery) {
        if (mode === 'replace') {
          resetAndInvalidate()
        }
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (mode === 'append') {
        setIsFetchingMore(true)
        isFetchingMoreRef.current = true
      } else {
        setIsLoading(true)
      }

      try {
        const { documents, meta } = await searchKeyword({
          keyword: trimmedQuery,
          roomId: roomId,
          radius,
          page: nextPage,
          size: pageSize,
        })
        // 최신 요청이 아니면 응답을 버림
        if (requestIdRef.current !== requestId) return
        const newResults = mode === 'append' ? [...searchResults, ...documents] : documents
        setSearchResults(newResults)
        setPage(nextPage)
        setHasMore(!meta.is_end)
        onSearchComplete?.(newResults)
      } catch (error) {
        console.error('검색 실패:', error)
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
          setIsFetchingMore(false)
          isFetchingMoreRef.current = false
        }
      }
    },
    [searchQuery, roomId, radius, pageSize, resetAndInvalidate, searchResults, onSearchComplete],
  )

  const handleSearch = useCallback(async () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      resetAndInvalidate()
      return
    }
    if (isLoading || isFetchingMore) return
    if (page !== 1) {
      setPage(1)
    }
    if (hasMore) {
      setHasMore(false)
    }
    await fetchSearchResults(1, 'replace')
  }, [fetchSearchResults, hasMore, isFetchingMore, isLoading, page, resetAndInvalidate, searchQuery])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingMoreRef.current) return
    if (!searchQuery.trim()) return
    fetchSearchResults(page + 1, 'append')
  }, [fetchSearchResults, hasMore, isLoading, page, searchQuery])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      entries => {
        // 하단 sentinel이 보이면 다음 페이지 로드
        if (entries[0]?.isIntersecting) {
          handleLoadMore()
        }
      },
      { rootMargin: '120px' },
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [handleLoadMore])

  return {
    searchQuery,
    setSearchQuery: updateSearchQuery,
    searchResults,
    isLoading,
    isFetchingMore,
    hasMore,
    handleSearch,
    loadMoreRef,
  }
}
