import { useState, useEffect, useRef, useMemo } from 'react'
import { useInfiniteGoogleSearch } from '@/shared/hooks'
import type { GooglePlace } from '@/shared/types'

const DEFAULT_MAX_RESULT_COUNT = 20
const DEFAULT_RADIUS = 2000

interface CategorySearchState {
  searchTerm: string
}

interface UseLocationSearchOptions {
  roomId: string
  categoryId: string
  radius?: number
  maxResultCount?: number
  onSearchComplete?: (results: GooglePlace[]) => void
}

export function useLocationSearch({
  roomId,
  categoryId,
  radius = DEFAULT_RADIUS,
  maxResultCount = DEFAULT_MAX_RESULT_COUNT,
  onSearchComplete,
}: UseLocationSearchOptions) {
  const cacheRef = useRef<Record<string, CategorySearchState>>({})
  const prevCategoryKeyRef = useRef(categoryId)

  const [searchTerm, setSearchTerm] = useState('')
  const searchTermRef = useRef(searchTerm)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const onSearchCompleteRef = useRef(onSearchComplete)

  useEffect(() => {
    onSearchCompleteRef.current = onSearchComplete
  }, [onSearchComplete])

  useEffect(() => {
    if (prevCategoryKeyRef.current === categoryId) return

    cacheRef.current[prevCategoryKeyRef.current] = {
      searchTerm: searchTermRef.current,
    }
    prevCategoryKeyRef.current = categoryId

    const restored = cacheRef.current[categoryId]
    if (restored) {
      setSearchTerm(restored.searchTerm)
      searchTermRef.current = restored.searchTerm
    } else {
      setSearchTerm('')
      searchTermRef.current = ''
    }
  }, [categoryId])

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isSuccess, refetch } = useInfiniteGoogleSearch({
    textQuery: searchTerm,
    roomId,
    radius,
    maxResultCount,
  })

  const searchResults = useMemo(() => {
    if (!searchTerm) {
      return []
    }
    if (isLoading && !isFetchingNextPage) {
      return []
    }
    return data?.pages ?? []
  }, [data?.pages, isLoading, isFetchingNextPage, searchTerm])

  useEffect(() => {
    if (isSuccess && searchTerm && !isLoading) {
      onSearchCompleteRef.current?.(searchResults)
    }
  }, [isSuccess, searchResults, searchTerm, isLoading])

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

  const handleSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchTerm('')
      searchTermRef.current = ''
      return
    }

    if (trimmed === searchTerm) {
      refetch()
    } else {
      setSearchTerm(trimmed)
      searchTermRef.current = trimmed
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    searchTermRef.current = ''
    onSearchCompleteRef.current?.([])
  }

  return {
    searchResults,
    isLoading: isLoading && !!searchTerm,
    isFetchingMore: isFetchingNextPage,
    hasMore: hasNextPage ?? false,
    hasSearched: !!searchTerm,
    handleSearch,
    clearSearch,
    loadMoreRef,
  }
}
