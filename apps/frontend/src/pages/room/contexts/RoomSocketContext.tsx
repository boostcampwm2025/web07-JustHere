import { createContext } from 'react'
import type { useRoomSocketCache } from '../hooks/socket/useRoomSocketCache'

export type RoomSocketContextValue = ReturnType<typeof useRoomSocketCache>

export const RoomSocketContext = createContext<RoomSocketContextValue | null>(null)
