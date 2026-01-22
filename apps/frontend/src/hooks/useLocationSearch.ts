import { useState, useCallback, useEffect, useRef } from 'react'
import { searchKeyword } from '@/api/kakao'
import type { KakaoPlace } from '@/types/kakao'

const DEFAULT_PAGE_SIZE = 15
const DEFAULT_RADIUS = 2000

interface UseLocationSearchOptions {
  roomId: string
  radius?: number
  pageSize?: number
}

export function useLocationSearch({ roomId, radius = DEFAULT_RADIUS, pageSize = DEFAULT_PAGE_SIZE }: UseLocationSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isFetchingMoreRef = useRef(false)
  const requestIdRef = useRef(0)

  const fetchSearchResults = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      const trimmedQuery = searchQuery.trim()
      if (!trimmedQuery) {
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
        if (requestIdRef.current !== requestId) return
        setSearchResults(prev => (mode === 'append' ? [...prev, ...documents] : documents))
        setPage(nextPage)
        setHasMore(!meta.is_end)
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
    [searchQuery, roomId, radius, pageSize],
  )

  const handleSearch = useCallback(async () => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) return
    if (isLoading || isFetchingMore) return
    if (page !== 1) {
      setPage(1)
    }
    if (hasMore) {
      setHasMore(false)
    }
    await fetchSearchResults(1, 'replace')
  }, [fetchSearchResults, hasMore, isFetchingMore, isLoading, page, searchQuery])

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
    setSearchQuery,
    searchResults,
    isLoading,
    isFetchingMore,
    hasMore,
    handleSearch,
    loadMoreRef,
  }
}
