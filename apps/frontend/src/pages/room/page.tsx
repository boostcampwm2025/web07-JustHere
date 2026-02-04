import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { socketBaseUrl } from '@/shared/config/socket'
import type { Category, GooglePlace, PlaceCard } from '@/shared/types'
import { useRoomCategories, useRoomMeta, useRoomParticipants } from '@/shared/hooks'
import { AddCategoryModal, LocationListSection, RoomHeader, WhiteboardSection } from './components'
import { useResolvedPlaces, useRoomSocket } from './hooks'
import { SEO } from '@/shared/components'
import type { TabType } from '@/pages/room/types/location'

export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const { ready, roomId, currentRegion, updateParticipantName, transferOwner, createCategory, deleteCategory, categoryError, clearCategoryError } =
    useRoomSocket()

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const { data: categories } = useRoomCategories(roomId)
  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId
  const [pendingPlaceCard, setPendingPlaceCard] = useState<Omit<PlaceCard, 'x' | 'y'> | null>(null)
  const [searchResultsByCategory, setSearchResultsByCategory] = useState<Record<string, GooglePlace[]>>({})
  const [candidatePlaceIds, setCandidatePlaceIds] = useState<string[]>([])
  const [selectedPlaceByCategory, setSelectedPlaceByCategory] = useState<Record<string, GooglePlace | null>>({})
  const [activeLocationTab, setActiveLocationTab] = useState<TabType>('locations')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [isLocationListCollapsed, setIsLocationListCollapsed] = useState(false)
  const pendingDeleteRef = useRef<Map<string, CategoryDeleteSnapshot>>(new Map())
  const lastHandledCategoryErrorRef = useRef<string | null>(null)
  const activeCategoryId = useMemo(() => resolveActiveCategoryId(categories, selectedCategoryId), [categories, selectedCategoryId])
  const activeSearchResults = searchResultsByCategory[activeCategoryId] ?? []
  const activeSelectedPlace = selectedPlaceByCategory[activeCategoryId] ?? null
  const candidatePlaces = useResolvedPlaces(candidatePlaceIds, activeSearchResults)

  const handleStartPlaceCard = (card: Omit<PlaceCard, 'x' | 'y'>) => {
    setPendingPlaceCard(card)
  }
  const clearPendingPlaceCard = () => {
    setPendingPlaceCard(null)
  }

  const handleSearchComplete = useCallback(
    (results: GooglePlace[]) => {
      if (!activeCategoryId) return
      setSearchResultsByCategory(prev => ({ ...prev, [activeCategoryId]: results }))
      if (results.length === 0) {
        setSelectedPlaceByCategory(prev => ({ ...prev, [activeCategoryId]: null }))
      }
    },
    [activeCategoryId],
  )

  const handlePlaceSelect = useCallback(
    (place: GooglePlace | null) => {
      if (!activeCategoryId) return
      setSelectedPlaceByCategory(prev => ({ ...prev, [activeCategoryId]: place }))
    },
    [activeCategoryId],
  )

  useEffect(() => {
    if (!categoryError) return

    const errorKey = categoryError.timestamp
    if (lastHandledCategoryErrorRef.current === errorKey) {
      clearCategoryError()
      return
    }
    lastHandledCategoryErrorRef.current = errorKey

    const categoryId = getCategoryIdFromError(categoryError)
    if (!categoryId) {
      clearCategoryError()
      return
    }

    const snapshot = pendingDeleteRef.current.get(categoryId)
    if (!snapshot) {
      clearCategoryError()
      return
    }

    if (snapshot.hasSearchResults) {
      setSearchResultsByCategory(prev =>
        Object.prototype.hasOwnProperty.call(prev, categoryId) ? prev : { ...prev, [categoryId]: snapshot.searchResults },
      )
    }

    if (snapshot.hasSelectedPlace) {
      setSelectedPlaceByCategory(prev =>
        Object.prototype.hasOwnProperty.call(prev, categoryId) ? prev : { ...prev, [categoryId]: snapshot.selectedPlace },
      )
    }

    pendingDeleteRef.current.delete(categoryId)
    clearCategoryError()
  }, [categoryError, clearCategoryError])

  useEffect(() => {
    const activeCategoryIds = new Set(categories.map(category => category.id))
    for (const key of pendingDeleteRef.current.keys()) {
      if (!activeCategoryIds.has(key)) {
        pendingDeleteRef.current.delete(key)
      }
    }
  }, [categories])

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      deleteCategory(categoryId)
      setSearchResultsByCategory(prev => {
        const snapshot = pendingDeleteRef.current.get(categoryId) ?? createEmptySnapshot()
        if (!snapshot.hasSearchResults) {
          snapshot.hasSearchResults = Object.prototype.hasOwnProperty.call(prev, categoryId)
          snapshot.searchResults = prev[categoryId] ?? []
        }
        pendingDeleteRef.current.set(categoryId, snapshot)
        return removeKey(prev, categoryId)
      })
      setSelectedPlaceByCategory(prev => {
        const snapshot = pendingDeleteRef.current.get(categoryId) ?? createEmptySnapshot()
        if (!snapshot.hasSelectedPlace) {
          snapshot.hasSelectedPlace = Object.prototype.hasOwnProperty.call(prev, categoryId)
          snapshot.selectedPlace = prev[categoryId] ?? null
        }
        pendingDeleteRef.current.set(categoryId, snapshot)
        return removeKey(prev, categoryId)
      })
    },
    [deleteCategory],
  )

  const handleActiveLocationTab = useCallback(
    (tab: TabType) => {
      handlePlaceSelect(null)
      setActiveLocationTab(tab)
    },
    [handlePlaceSelect],
  )

  if (!slug) {
    return <Navigate to="/onboarding" replace />
  }

  if (!user) {
    return null
  }

  const roomLink = `${socketBaseUrl}/room/${slug}`
  const roomTitle = '딱! 여기 - 모임 장소를 실시간으로 정하는 서비스'
  const roomDescription = '우리 어디서 만나? 딱! 여기에서 실시간으로 재밌게 정하자!'
  const pageUrl = typeof window === 'undefined' ? '' : window.location.href
  const mapMarkers = activeLocationTab === 'candidates' ? candidatePlaces : activeSearchResults

  if (!ready || !roomId) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <SEO title={roomTitle} description={roomDescription} url={pageUrl} />
        <RoomHeader
          participants={participants}
          currentUserId={user.userId}
          roomLink={roomLink}
          onUpdateName={updateParticipantName}
          isOwner={isOwner}
          ownerId={ownerId}
          onTransferOwner={transferOwner}
        />
      </div>
    )
  }

  if (!categories.length) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <SEO title={roomTitle} description={roomDescription} url={pageUrl} />
        <RoomHeader
          participants={participants}
          currentUserId={user.userId}
          roomLink={roomLink}
          onUpdateName={updateParticipantName}
          isOwner={isOwner}
          ownerId={ownerId}
          onTransferOwner={transferOwner}
        />

        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <AddCategoryModal
            onComplete={name => {
              createCategory(name)
            }}
            closeable={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <SEO title={roomTitle} description={roomDescription} url={pageUrl} />
      <RoomHeader
        participants={participants}
        currentUserId={user.userId}
        roomLink={roomLink}
        onUpdateName={updateParticipantName}
        isOwner={isOwner}
        ownerId={ownerId}
        onTransferOwner={transferOwner}
        currentRegion={currentRegion ?? undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        <LocationListSection
          roomId={roomId}
          userId={user.userId}
          userName={user.name}
          participants={participants}
          isOwner={isOwner}
          activeCategoryId={activeCategoryId}
          pendingPlaceCard={pendingPlaceCard}
          onStartPlaceCard={handleStartPlaceCard}
          onCancelPlaceCard={clearPendingPlaceCard}
          onSearchComplete={handleSearchComplete}
          activeTab={activeLocationTab}
          onActiveTabChange={handleActiveLocationTab}
          onCandidatePlaceIdsChange={setCandidatePlaceIds}
          selectedPlace={activeSelectedPlace}
          onPlaceSelect={handlePlaceSelect}
          candidatePlaces={candidatePlaces}
          isCollapsed={isLocationListCollapsed}
          onToggleCollapse={() => setIsLocationListCollapsed(prev => !prev)}
        />
        <WhiteboardSection
          roomId={roomId}
          onActiveCategoryChange={setSelectedCategoryId}
          onCreateCategory={createCategory}
          onDeleteCategory={handleDeleteCategory}
          categories={categories}
          activeCategoryId={activeCategoryId}
          pendingPlaceCard={pendingPlaceCard}
          onPlaceCardPlaced={clearPendingPlaceCard}
          onPlaceCardCanceled={clearPendingPlaceCard}
          searchResults={mapMarkers}
          selectedPlace={activeSelectedPlace}
          onMarkerClick={handlePlaceSelect}
        />
      </div>
    </div>
  )
}

function resolveActiveCategoryId(categories: Category[], currentId: string) {
  if (!categories || categories.length === 0) return ''

  const exists = categories.some(c => c.id === currentId)
  return exists ? currentId : categories[0].id
}

type CategoryDeleteSnapshot = {
  hasSearchResults: boolean
  searchResults: GooglePlace[]
  hasSelectedPlace: boolean
  selectedPlace: GooglePlace | null
}

function createEmptySnapshot(): CategoryDeleteSnapshot {
  return {
    hasSearchResults: false,
    searchResults: [],
    hasSelectedPlace: false,
    selectedPlace: null,
  }
}

function getCategoryIdFromError(error: { data?: unknown }) {
  if (!error.data || typeof error.data !== 'object') return null
  const candidate = (error.data as { categoryId?: unknown }).categoryId
  return typeof candidate === 'string' ? candidate : null
}

function removeKey<T>(source: Record<string, T>, key: string) {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return source
  const next = { ...source }
  delete next[key]
  return next
}
