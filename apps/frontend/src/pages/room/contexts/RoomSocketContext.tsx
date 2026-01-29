import { createContext } from 'react'
import type { useRoomSocketCache } from '@/pages/room/hooks/socket'

export const RoomSocketContext = createContext<ReturnType<typeof useRoomSocketCache> | null>(null)
