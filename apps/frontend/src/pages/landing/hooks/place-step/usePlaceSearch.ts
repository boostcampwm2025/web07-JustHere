import { useEffect, useState } from 'react'
import type { TutorialPlace } from '@/pages/landing/types'
import { TUTORIAL_PLACES } from '@/pages/landing/constants'

export function usePlaceSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TutorialPlace[]>([])

  useEffect(() => {
    if (searchQuery) {
      const filtered = TUTORIAL_PLACES.filter(
        place => place.name.toLowerCase().includes(searchQuery.toLowerCase()) || place.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      const timeout = setTimeout(() => setSearchResults(filtered), 0)
      return () => clearTimeout(timeout)
    } else {
      const timeout = setTimeout(() => setSearchResults([]), 0)
      return () => clearTimeout(timeout)
    }
  }, [searchQuery])

  return { searchQuery, setSearchQuery, searchResults }
}
