import { useEffect } from 'react'
import Header from '@/components/common/Header'
import WhiteboardSection from '@/components/main/WhiteboardSection'
import LocationListSection from '@/components/main/LocationListSection'
import { useRoomMeta, useRoomParticipants, useRoomSocketCache } from '@/hooks/room'
import { MOCK_ROOM_ID, MOCK_USER } from '@/mocks'

function MainPage() {
  const { joinRoom, leaveRoom, ready, roomId } = useRoomSocketCache()
  const { data: participants } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)

  useEffect(() => {
    joinRoom(MOCK_ROOM_ID, MOCK_USER)
    return () => leaveRoom()
  }, [leaveRoom, joinRoom])

  if (!ready) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <Header participants={participants} me={roomMeta?.me} />
        <div className="p-6 text-gray">loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header participants={participants} me={roomMeta?.me} />
      <div className="flex flex-1 overflow-hidden">
        <WhiteboardSection />
        <LocationListSection />
      </div>
    </div>
  )
}

export default MainPage
