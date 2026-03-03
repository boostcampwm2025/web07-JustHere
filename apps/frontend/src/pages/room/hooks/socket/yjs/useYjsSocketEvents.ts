import { useEffect } from 'react'
import { Doc as YDoc, applyUpdate as YapplyUpdate } from 'yjs'
import type { Socket } from 'socket.io-client'
import type { CanvasAttachedPayload, YjsAwarenessBroadcast, YjsUpdateBroadcast } from '@/shared/types'
import { addSocketBreadcrumb } from '@/shared/utils'
import { CANVAS_EVENTS, YJS_EVENTS } from '@/pages/room/constants'

interface UseYjsSocketEventsOptions {
  resolveSocket: () => Socket | null
  enabled?: boolean
  roomId: string
  canvasId: string
  docRef: { current: YDoc | null }
  applyAwareness: (payload: YjsAwarenessBroadcast) => void
  trackHighFreq: (key: string, bytes?: number) => void
}

export const useYjsSocketEvents = ({
  resolveSocket,
  enabled = true,
  roomId,
  canvasId,
  docRef,
  applyAwareness,
  trackHighFreq,
}: UseYjsSocketEventsOptions) => {
  useEffect(() => {
    if (!enabled) return

    const socket = resolveSocket()
    const doc = docRef.current
    if (!socket || !doc) return

    const handleCanvasAttached = ({ update }: CanvasAttachedPayload) => {
      if (!update) return

      const updateArray = new Uint8Array(update)
      YapplyUpdate(doc, updateArray, socket)
      addSocketBreadcrumb(CANVAS_EVENTS.attach, { roomId, canvasId, bytes: updateArray.byteLength })
    }

    const handleCanvasDetached = () => {
      addSocketBreadcrumb(CANVAS_EVENTS.detach, { roomId, canvasId })
    }

    const handleYjsUpdate = ({ canvasId: payloadCanvasId, update }: YjsUpdateBroadcast) => {
      if (payloadCanvasId !== canvasId) return
      const updateArray = new Uint8Array(update)
      YapplyUpdate(doc, updateArray, socket)
      trackHighFreq(YJS_EVENTS.updateRecv, updateArray.byteLength)
    }

    const handleAwareness = (payload: YjsAwarenessBroadcast) => {
      trackHighFreq(YJS_EVENTS.awarenessRecv)
      applyAwareness(payload)
    }

    socket.on(CANVAS_EVENTS.attach, handleCanvasAttached)
    socket.on(CANVAS_EVENTS.detach, handleCanvasDetached)
    socket.on(YJS_EVENTS.update, handleYjsUpdate)
    socket.on(YJS_EVENTS.awareness, handleAwareness)

    return () => {
      socket.off(CANVAS_EVENTS.attach, handleCanvasAttached)
      socket.off(CANVAS_EVENTS.detach, handleCanvasDetached)
      socket.off(YJS_EVENTS.update, handleYjsUpdate)
      socket.off(YJS_EVENTS.awareness, handleAwareness)
    }
  }, [resolveSocket, enabled, roomId, canvasId, docRef, applyAwareness, trackHighFreq])
}
