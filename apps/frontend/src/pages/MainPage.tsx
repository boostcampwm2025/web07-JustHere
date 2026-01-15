import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Header from '@/components/common/Header'
import WhiteboardSection from '@/components/main/WhiteboardSection'
import LocationListSection from '@/components/main/LocationListSection'
import { useRoomMeta, useRoomParticipants, useRoomSocketCache } from '@/hooks/room'
import { getOrCreateStoredUser, type StoredUser } from '@/utils/userStorage'

function MainPage() {
  const { slug } = useParams<{ slug: string }>()
  const { joinRoom, leaveRoom, ready, roomId } = useRoomSocketCache()
  const { data: participants } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const [user] = useState<StoredUser>(() => getOrCreateStoredUser())
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin
  const roomLink = slug && baseUrl ? `${baseUrl}/room/${slug}` : undefined

  useEffect(() => {
    if (!slug || !user) return
    joinRoom(slug, user)
    return () => leaveRoom()
  }, [leaveRoom, joinRoom, slug, user])

  if (!slug) {
    return <Navigate to="/onboarding" replace />
  }

  if (!ready) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <Header participants={participants} me={roomMeta?.me} roomLink={roomLink} />
        <div className="p-6 text-gray">loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header participants={participants} me={roomMeta?.me} roomLink={roomLink} />
      <div className="flex flex-1 overflow-hidden">
        <WhiteboardSection />
        <LocationListSection />
      </div>
    </div>
  )
}

export default MainPage
