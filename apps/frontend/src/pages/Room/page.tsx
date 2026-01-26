import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { socketBaseUrl } from '@/shared/config/socket'
import type { KakaoPlace, PlaceCard } from '@/shared/types'
import { RoomHeader, WhiteboardSection, LocationListSection } from './components'
import { useRoomMeta, useRoomParticipants, useRoomSocketCache } from './hooks'

export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const { joinRoom, leaveRoom, ready, roomId, currentRegion, updateParticipantName, transferOwner, createCategory, deleteCategory } =
    useRoomSocketCache()

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId
  const [pendingPlaceCard, setPendingPlaceCard] = useState<Omit<PlaceCard, 'x' | 'y'> | null>(null)
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null)
  const handleStartPlaceCard = (card: Omit<PlaceCard, 'x' | 'y'>) => {
    setPendingPlaceCard(card)
  }
  const clearPendingPlaceCard = () => {
    setPendingPlaceCard(null)
  }

  useEffect(() => {
    if (!slug || !user) return
    joinRoom(slug, user)
    return () => leaveRoom()
  }, [leaveRoom, joinRoom, slug, user])

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
        <div className="p-6 text-gray">loading...</div>
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
        <WhiteboardSection
          roomId={roomId}
          onCreateCategory={createCategory}
          onDeleteCategory={deleteCategory}
          pendingPlaceCard={pendingPlaceCard}
          onPlaceCardPlaced={clearPendingPlaceCard}
          onPlaceCardCanceled={clearPendingPlaceCard}
          searchResults={searchResults}
          selectedPlace={selectedPlace}
          onMarkerClick={setSelectedPlace}
        />
        <LocationListSection
          roomId={roomId}
          slug={slug}
          currentRegion={currentRegion}
          pendingPlaceCard={pendingPlaceCard}
          onStartPlaceCard={handleStartPlaceCard}
          onCancelPlaceCard={clearPendingPlaceCard}
          onSearchComplete={setSearchResults}
          selectedPlace={selectedPlace}
          onPlaceSelect={setSelectedPlace}
        />
      </div>
    </div>
  )
}
