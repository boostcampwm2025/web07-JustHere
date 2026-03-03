import { useEffect } from 'react'
import * as Y from 'yjs'
import type { Socket } from 'socket.io-client'
import type { CanvasAttachedPayload, YjsAwarenessBroadcast, YjsUpdateBroadcast } from '@/shared/types'
import { addSocketBreadcrumb } from '@/shared/utils'

interface UseCanvasSocketEventsOptions {
  resolveSocket: () => Socket | null
  enabled?: boolean
  roomId: string
  canvasId: string
  docRef: { current: Y.Doc | null }
  applyAwareness: (payload: YjsAwarenessBroadcast) => void
  trackHighFreq: (key: string, bytes?: number) => void
}

export const useCanvasSocketEvents = ({
  resolveSocket,
  enabled = true,
  roomId,
  canvasId,
  docRef,
  applyAwareness,
  trackHighFreq,
}: UseCanvasSocketEventsOptions) => {
  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    const doc = docRef.current
    if (!socket || !doc) return

    const handleCanvasAttached = ({ update }: CanvasAttachedPayload) => {
      if (!update) return

      const updateArray = new Uint8Array(update)
      Y.applyUpdate(doc, updateArray, socket)
      addSocketBreadcrumb('canvas:attached', { roomId, canvasId, bytes: updateArray.byteLength })
    }

    const handleCanvasDetached = () => {
      addSocketBreadcrumb('canvas:detached', { roomId, canvasId })
    }

    const handleYjsUpdate = ({ update }: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(update)
      Y.applyUpdate(doc, updateArray, socket)
      trackHighFreq('y:update:recv', updateArray.byteLength)
    }

    const handleAwareness = (payload: YjsAwarenessBroadcast) => {
      trackHighFreq('y:awareness:recv')
      applyAwareness(payload)
    }

    socket.on('canvas:attached', handleCanvasAttached)
    socket.on('canvas:detached', handleCanvasDetached)
    socket.on('y:update', handleYjsUpdate)
    socket.on('y:awareness', handleAwareness)

    return () => {
      socket.off('canvas:attached', handleCanvasAttached)
      socket.off('canvas:detached', handleCanvasDetached)
      socket.off('y:update', handleYjsUpdate)
      socket.off('y:awareness', handleAwareness)
    }
  }, [resolveSocket, enabled, roomId, canvasId, docRef, applyAwareness, trackHighFreq])
}
