import { create } from 'zustand'
import type { CursorInfoWithId, YjsAwarenessBroadcast } from '@/shared/types'

interface CursorPresenceState {
  cursors: Map<string, CursorInfoWithId>
  applyAwareness: (payload: YjsAwarenessBroadcast) => void
  clearCursors: () => void
}

export const useCursorPresenceStore = create<CursorPresenceState>((set, get) => ({
  cursors: new Map(),
  applyAwareness: ({ socketId, state }) => {
    const cursor = state.cursor
    const next = new Map(get().cursors)

    if (cursor) {
      next.set(socketId, {
        x: cursor.x,
        y: cursor.y,
        name: cursor.name,
        chatActive: cursor.chatActive,
        chatMessage: cursor.chatMessage,
        socketId,
      })
    } else {
      next.delete(socketId)
    }
    set({ cursors: next })
  },
  clearCursors: () => {
    if (get().cursors.size === 0) return
    set({ cursors: new Map() })
  },
}))
