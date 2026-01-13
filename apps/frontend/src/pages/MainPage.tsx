import { useEffect } from 'react'
import Header from '@/components/common/Header'
import WhiteboardSection from '@/components/main/WhiteboardSection'
import LocationListSection from '@/components/main/LocationListSection'
import { useRoomSocket } from '@/hooks/useRoomSocket'
import { MOCK_ROOM_ID, MOCK_USER } from '@/mocks'

function MainPage() {
  const { joinRoom, leaveRoom } = useRoomSocket()

  useEffect(() => {
    joinRoom(MOCK_ROOM_ID, MOCK_USER)
    return () => leaveRoom()
  }, [leaveRoom, joinRoom])

  return (
    <div className="flex flex-col h-screen bg-gray-bg">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <WhiteboardSection />
        <LocationListSection />
      </div>
    </div>
  )
}

export default MainPage
