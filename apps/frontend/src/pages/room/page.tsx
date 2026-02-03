import { useCallback, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { socketBaseUrl } from '@/shared/config/socket'
import type { Category, GooglePlace, PlaceCard } from '@/shared/types'
import { useRoomCategories, useRoomMeta, useRoomParticipants } from '@/shared/hooks'
import { AddCategoryModal, LocationListSection, RoomHeader, WhiteboardSection } from './components'
import { useResolvedPlaces, useRoomSocket } from './hooks'
import { Button, SEO } from '@/shared/components'

export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const { ready, roomId, currentRegion, updateParticipantName, transferOwner, createCategory, deleteCategory } = useRoomSocket()

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const { data: categories } = useRoomCategories(roomId)
  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId
  const [pendingPlaceCard, setPendingPlaceCard] = useState<Omit<PlaceCard, 'x' | 'y'> | null>(null)
  const [searchResultsByCategory, setSearchResultsByCategory] = useState<Record<string, GooglePlace[]>>({})
  const [candidatePlaceIds, setCandidatePlaceIds] = useState<string[]>([])
  const [selectedPlaceByCategory, setSelectedPlaceByCategory] = useState<Record<string, GooglePlace | null>>({})
  const [activeLocationTab, setActiveLocationTab] = useState<'locations' | 'candidates'>('locations')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const activeCategoryId = useMemo(() => resolveActiveCategoryId(categories, selectedCategoryId), [categories, selectedCategoryId])
  const activeSearchResults = searchResultsByCategory[activeCategoryId] ?? []
  const activeSelectedPlace = selectedPlaceByCategory[activeCategoryId] ?? null
  const candidatePlaces = useResolvedPlaces(candidatePlaceIds, activeSearchResults)
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(() => !categories.length)
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

  const removeKey = useCallback(<T,>(source: Record<string, T>, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return source
    const next = { ...source }
    delete next[key]
    return next
  }, [])

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      deleteCategory(categoryId)
      setSearchResultsByCategory(prev => removeKey(prev, categoryId))
      setSelectedPlaceByCategory(prev => removeKey(prev, categoryId))
    },
    [deleteCategory, removeKey],
  )

  if (!slug) {
    return <Navigate to="/onboarding" replace />
  }

  if (!user) {
    return null
  }

  const roomLink = `${socketBaseUrl}/share/room/${slug}`
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
          {isCreateCategoryModalOpen ? (
            <AddCategoryModal
              onClose={() => setIsCreateCategoryModalOpen(false)}
              onComplete={name => {
                createCategory(name)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-disable">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">캔버스가 없습니다</p>
                <p className="text-sm">새 카테고리를 추가해주세요</p>
              </div>
              <Button className="mt-4" onClick={() => setIsCreateCategoryModalOpen(true)}>
                추가하기
              </Button>
            </div>
          )}
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
          onActiveTabChange={setActiveLocationTab}
          onCandidatePlaceIdsChange={setCandidatePlaceIds}
          selectedPlace={activeSelectedPlace}
          onPlaceSelect={handlePlaceSelect}
          candidatePlaces={candidatePlaces}
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
