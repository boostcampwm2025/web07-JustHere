import { useContext } from 'react'
import { RoomSocketContext } from '@/pages/room/contexts/RoomSocketContext'

export function useRoomSocket() {
  const context = useContext(RoomSocketContext)

  if (!context) {
    throw new Error('useRoomSocket must be used within RoomSocketProvider')
  }

  return context
}
