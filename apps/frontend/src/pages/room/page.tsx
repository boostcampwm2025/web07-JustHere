import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getOrCreateStoredUser } from '@/shared/utils'
import { socketBaseUrl } from '@/shared/config/socket'
import type { Category, GooglePlace, PlaceCard } from '@/shared/types'
import { useRoomCategories, useRoomMeta, useRoomParticipants } from '@/shared/hooks'
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/assets'
import { Button, Skeleton } from '@/shared/components'
import { cn } from '@/shared/utils'
import type { TabType } from '@/pages/room/types/location'
import { getPlaceDetails } from '@/shared/api'
import { googleKeys } from '@/shared/hooks'
import { AddCategoryModal, LocationListSection, RoomHeader, WhiteboardSection } from './components'
import { useResolvedPlaces, useRoomSocket } from './hooks'

const LOCATION_PANEL_WIDTH = 420
const LOCATION_PANEL_CLASS = `w-[${LOCATION_PANEL_WIDTH}px]`

export default function RoomPage() {
  const queryClient = useQueryClient()
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
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const pendingDeleteRef = useRef<Map<string, CategoryDeleteSnapshot>>(new Map())
  const lastHandledCategoryErrorRef = useRef<string | null>(null)
  const activeCategoryId = useMemo(() => resolveActiveCategoryId(categories, selectedCategoryId), [categories, selectedCategoryId])
  const activeSearchResults = searchResultsByCategory[activeCategoryId] ?? []
  const activeSelectedPlace = selectedPlaceByCategory[activeCategoryId] ?? null
  const candidatePlaces = useResolvedPlaces(candidatePlaceIds, activeSearchResults)

  const handleShowDetail = useCallback(
    async (placeId: string) => {
      setIsLocationListCollapsed(false)
      setIsLoadingDetail(true)
      try {
        const data = await queryClient.fetchQuery({
          queryKey: googleKeys.placeDetails(placeId),
          queryFn: () => getPlaceDetails(placeId),
        })
        if (activeCategoryId) {
          setSelectedPlaceByCategory(prev => ({
            ...prev,
            [activeCategoryId]: data,
          }))
        }
      } catch (error) {
        reportError({ error, code: 'CLIENT_UNKNOWN', context: { placeId, source: 'handleShowDetail' } })
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [activeCategoryId, queryClient],
  )

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
  const mapMarkers = activeLocationTab === 'candidates' ? candidatePlaces : activeSearchResults

  // 데이터가 로딩되지 못했을 때 동작하는 스켈레톤 UI이지만, RoomHeader 또한 마찬가지로 로딩된 데이터를 props로 받아오는 컴포넌트이므로 새로고침 시 flickering 발생
  // 따라서, 데이터 로딩 시 정적인 스켈레톤 UI로 대체하여 Flikering 방지
  if (!ready || !roomId) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg" role="status" aria-label="페이지 로딩 중" aria-busy="true">
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Skeleton className="w-32 h-8" />
            <Skeleton className="w-24 h-8" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-24 h-8" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className={cn('border-r border-gray-200 bg-white p-6', LOCATION_PANEL_CLASS)}>
            <div className="space-y-6">
              <Skeleton className="w-full h-12" />
              <div className="space-y-4">
                <Skeleton className="w-full h-24" />
                <Skeleton className="w-full h-24" />
                <Skeleton className="w-full h-24" />
              </div>
            </div>
          </div>
          <div className="flex-1 bg-gray-50 p-6">
            <div className="w-full h-full bg-white rounded-lg border border-gray-200 p-6">
              <Skeleton className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!categories.length) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
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
      <div className="relative flex flex-1 overflow-hidden">
        {/* LocationListSection wrapper */}
        <div className={cn('overflow-hidden transition-[width] duration-300 ease-in-out', isLocationListCollapsed ? 'w-0' : LOCATION_PANEL_CLASS)}>
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
            isLoadingDetail={isLoadingDetail}
          />
        </div>
        {/* 패널 토글 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLocationListCollapsed(prev => !prev)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white border border-l-0 border-gray-200 rounded-r-lg rounded-l-none hover:bg-gray-50 transition-[left] duration-300 ease-in-out',
            isLocationListCollapsed ? 'left-0' : `left-[${LOCATION_PANEL_WIDTH}px]`,
          )}
          aria-label={isLocationListCollapsed ? '패널 열기' : '패널 접기'}
        >
          {isLocationListCollapsed ? <ChevronRightIcon className="w-4 h-4 text-gray-600" /> : <ChevronLeftIcon className="w-4 h-4 text-gray-600" />}
        </Button>
        <WhiteboardSection
          roomId={roomId}
          onShowDetail={handleShowDetail}
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
