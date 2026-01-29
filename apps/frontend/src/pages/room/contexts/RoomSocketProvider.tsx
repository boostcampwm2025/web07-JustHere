import { useEffect, useMemo, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { useRoomSocketCache } from '@/pages/room/hooks/socket/useRoomSocketCache'
import { RoomSocketContext } from './RoomSocketContext'

interface RoomSocketProviderProps {
  children: ReactNode
}

export function RoomSocketProvider({ children }: RoomSocketProviderProps) {
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const socketCache = useRoomSocketCache()
  const { joinRoom, leaveRoom } = socketCache

  useEffect(() => {
    if (!slug || !user) return
    joinRoom(slug, user)
    return () => leaveRoom()
  }, [joinRoom, leaveRoom, slug, user])

  return <RoomSocketContext.Provider value={socketCache}>{children}</RoomSocketContext.Provider>
}
