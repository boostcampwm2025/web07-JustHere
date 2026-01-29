import { useEffect, useRef, useState } from 'react'
import type { TutorialPlace, TutorialPlaceCandidate } from '@/pages/landing/types'

export function usePlaceState() {
  const [canvasPlaces, setCanvasPlaces] = useState<number[]>([])
  const [candidates, setCandidates] = useState<TutorialPlaceCandidate[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'candidates'>('list')
  const [selectedPlace, setSelectedPlace] = useState<TutorialPlace | null>(null)

  const placeDetailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedPlace) return

    const handleClickOutside = (event: MouseEvent) => {
      if (placeDetailRef.current && !placeDetailRef.current.contains(event.target as Node)) {
        setSelectedPlace(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedPlace])

  const addToCanvas = (place: TutorialPlace) => {
    setCanvasPlaces(prev => (prev.includes(place.id) ? prev : [...prev, place.id]))
  }

  const addToCandidate = (place: TutorialPlace) => {
    setCandidates(prev => {
      if (prev.some(c => c.place.id === place.id)) return prev
      return [...prev, { id: place.id, place }]
    })
  }

  const removeFromCandidate = (id: number) => {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  return {
    canvasPlaces,
    candidates,
    viewMode,
    setViewMode,
    selectedPlace,
    setSelectedPlace,
    placeDetailRef,
    addToCanvas,
    addToCandidate,
    removeFromCandidate,
  }
}
