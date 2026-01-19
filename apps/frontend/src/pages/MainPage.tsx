import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Header from '@/components/common/Header'
import WhiteboardSection from '@/components/main/WhiteboardSection'
import LocationListSection from '@/components/main/LocationListSection'
import { useRoomMeta, useRoomParticipants, useRoomSocketCache } from '@/hooks/room'
import { getOrCreateStoredUser, updateStoredUserName, type StoredUser } from '@/utils/userStorage'

function MainPage() {
  const { slug } = useParams<{ slug: string }>()
  const { joinRoom, leaveRoom, ready, roomId, updateParticipantName, transferOwner, createCategory } = useRoomSocketCache()

  const [user, setUser] = useState<StoredUser | null>(() => (slug ? getOrCreateStoredUser(slug) : null))

  const handleUpdateName = (name: string) => {
    if (!slug || !user) return

    updateParticipantName(name)
    updateStoredUserName(slug, name)
    setUser(prev => (prev ? { ...prev, name } : prev))
  }

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId

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

  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin
  const roomLink = `${baseUrl}/room/${slug}`

  if (!ready || !roomId) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <Header
          participants={participants}
          currentUserId={user.userId}
          userName={user.name}
          roomLink={roomLink}
          onUpdateName={handleUpdateName}
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
      <Header
        participants={participants}
        currentUserId={user.userId}
        userName={user.name}
        roomLink={roomLink}
        onUpdateName={handleUpdateName}
        isOwner={isOwner}
        ownerId={ownerId}
        onTransferOwner={transferOwner}
      />
      <div className="flex flex-1 overflow-hidden">
        <WhiteboardSection roomId={roomId} onCreateCategory={createCategory} />
        <LocationListSection />
      </div>
    </div>
  )
}

export default MainPage
