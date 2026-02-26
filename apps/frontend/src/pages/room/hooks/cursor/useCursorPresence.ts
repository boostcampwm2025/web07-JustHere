import { useCallback, useEffect, useState } from 'react'
import type { CursorInfoWithId, YjsAwarenessBroadcast } from '@/shared/types'

type Listener = () => void

const listeners = new Set<Listener>()
let cursors = new Map<string, CursorInfoWithId>()

const emitChange = () => {
  listeners.forEach(listener => listener())
}

const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

interface UseCursorPresenceOptions {
  subscribe?: boolean
}

export const useCursorPresence = ({ subscribe: shouldSubscribe = false }: UseCursorPresenceOptions = {}) => {
  const [snapshot, setSnapshot] = useState<Map<string, CursorInfoWithId>>(() => cursors)

  useEffect(() => {
    if (!shouldSubscribe) return

    return subscribe(() => {
      setSnapshot(cursors)
    })
  }, [shouldSubscribe])

  const applyAwareness = useCallback(({ socketId, state }: YjsAwarenessBroadcast) => {
    const cursor = state.cursor
    const next = new Map(cursors)

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

    cursors = next
    emitChange()
  }, [])

  const clearCursors = useCallback(() => {
    if (cursors.size === 0) return
    cursors = new Map()
    emitChange()
  }, [])

  return {
    cursors: shouldSubscribe ? snapshot : cursors,
    applyAwareness,
    clearCursors,
  }
}
