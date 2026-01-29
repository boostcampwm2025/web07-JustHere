import { createContext } from 'react'
import type { useRoomSocketCache } from '@/pages/room/hooks/socket'

export type RoomSocketContextValue = ReturnType<typeof useRoomSocketCache>

export const RoomSocketContext = createContext<RoomSocketContextValue | null>(null)
