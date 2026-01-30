import { useState, useEffect, useRef, useMemo } from 'react'
import { useInfiniteGoogleSearch } from '@/shared/hooks'
import type { GooglePlace } from '@/shared/types'

const DEFAULT_MAX_RESULT_COUNT = 20
const DEFAULT_RADIUS = 2000

interface CategorySearchState {
  searchQuery: string
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

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const searchQueryRef = useRef(searchQuery)
  const searchTermRef = useRef(searchTerm)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const onSearchCompleteRef = useRef(onSearchComplete)

  useEffect(() => {
    onSearchCompleteRef.current = onSearchComplete
  }, [onSearchComplete])

  useEffect(() => {
    if (prevCategoryKeyRef.current === categoryId) return

    cacheRef.current[prevCategoryKeyRef.current] = {
      searchQuery: searchQueryRef.current,
      searchTerm: searchTermRef.current,
    }
    prevCategoryKeyRef.current = categoryId

    const restored = cacheRef.current[categoryId]
    if (restored) {
      setSearchQuery(restored.searchQuery)
      searchQueryRef.current = restored.searchQuery
      setSearchTerm(restored.searchTerm)
      searchTermRef.current = restored.searchTerm
    } else {
      setSearchQuery('')
      searchQueryRef.current = ''
      setSearchTerm('')
      searchTermRef.current = ''
    }
  }, [categoryId])

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isSuccess } = useInfiniteGoogleSearch({
    textQuery: searchTerm,
    roomId,
    radius,
    maxResultCount,
  })

  const searchResults = useMemo(() => {
    if (isLoading && !isFetchingNextPage) {
      return []
    }
    return data?.pages ?? []
  }, [data?.pages, isLoading, isFetchingNextPage])

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

  const handleSearch = () => {
    const trimmed = searchQueryRef.current.trim()
    if (!trimmed) {
      setSearchTerm('')
      searchTermRef.current = ''
      return
    }
    setSearchTerm(trimmed)
    searchTermRef.current = trimmed
  }

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value)
    searchQueryRef.current = value
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
