import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { socketBaseUrl } from '@/shared/config/socket'
import type { Category, GooglePlace, PlaceCard } from '@/shared/types'
import { useRoomCategories, useRoomMeta, useRoomParticipants } from '@/shared/hooks'
import { RoomHeader, WhiteboardSection, LocationListSection, AddCategoryModal } from './components'
import { useRoomSocket } from './hooks'
import { Button } from '@/shared/components'

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
  const [searchResults, setSearchResults] = useState<GooglePlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const activeCategoryId = useMemo(() => resolveActiveCategoryId(categories, selectedCategoryId), [categories, selectedCategoryId])
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(() => !categories.length)
  const handleStartPlaceCard = (card: Omit<PlaceCard, 'x' | 'y'>) => {
    setPendingPlaceCard(card)
  }
  const clearPendingPlaceCard = () => {
    setPendingPlaceCard(null)
  }

  if (!slug) {
    return <Navigate to="/onboarding" replace />
  }

  if (!user) {
    return null
  }

  const roomLink = `${socketBaseUrl}/room/${slug}`

  if (!ready || !roomId) {
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
          onSearchComplete={setSearchResults}
          selectedPlace={selectedPlace}
          onPlaceSelect={setSelectedPlace}
        />
        <WhiteboardSection
          roomId={roomId}
          onActiveCategoryChange={setSelectedCategoryId}
          onCreateCategory={createCategory}
          onDeleteCategory={deleteCategory}
          categories={categories}
          activeCategoryId={activeCategoryId}
          pendingPlaceCard={pendingPlaceCard}
          onPlaceCardPlaced={clearPendingPlaceCard}
          onPlaceCardCanceled={clearPendingPlaceCard}
          searchResults={searchResults}
          selectedPlace={selectedPlace}
          onMarkerClick={setSelectedPlace}
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
