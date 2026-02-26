import { useEffect } from 'react'
import * as Y from 'yjs'
import type { Socket } from 'socket.io-client'
import type {
  CanvasAttachPayload,
  CanvasAttachedPayload,
  CanvasDetachPayload,
  YjsAwarenessBroadcast,
  YjsAwarenessPayload,
  YjsUpdateBroadcast,
  YjsUpdatePayload,
} from '@/shared/types'
import { addSocketBreadcrumb } from '@/shared/utils'

interface UseCanvasTransportOptions {
  roomId: string
  canvasId: string
  status: string
  getSocket: () => Socket | null
  docRef: { current: Y.Doc | null }
  socketRef: { current: Socket | null }
  trackHighFreq: (key: string, bytes?: number) => void
  applyRemoteAwareness: (payload: YjsAwarenessBroadcast) => void
  clearCursors: () => void
}

export const useCanvasTransport = ({
  roomId,
  canvasId,
  status,
  getSocket,
  docRef,
  socketRef,
  trackHighFreq,
  applyRemoteAwareness,
  clearCursors,
}: UseCanvasTransportOptions) => {
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const doc = docRef.current
    if (!doc) return

    socketRef.current = socket

    const handleConnect = () => {
      const attachPayload: CanvasAttachPayload = { roomId, canvasId }
      socket.emit('canvas:attach', attachPayload)
      addSocketBreadcrumb('canvas:attach', { roomId, canvasId })
    }

    const handleCanvasAttached = (payload: CanvasAttachedPayload) => {
      if (!payload.update) return

      const updateArray = new Uint8Array(payload.update)
      Y.applyUpdate(doc, updateArray, socket)
      addSocketBreadcrumb('canvas:attached', { roomId, canvasId, bytes: updateArray.byteLength })
    }

    const handleCanvasDetached = () => {
      addSocketBreadcrumb('canvas:detached', { roomId, canvasId })
    }

    const handleYjsUpdate = (payload: YjsUpdateBroadcast) => {
      const updateArray = new Uint8Array(payload.update)
      Y.applyUpdate(doc, updateArray, socket)
      trackHighFreq('y:update:recv', updateArray.byteLength)
    }

    const handleAwareness = (payload: YjsAwarenessBroadcast) => {
      trackHighFreq('y:awareness:recv')
      applyRemoteAwareness(payload)
    }

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin !== socket) {
        trackHighFreq('y:update:send', update.byteLength)
        const updatePayload: YjsUpdatePayload = {
          canvasId,
          update: Array.from(update),
        }
        socket.emit('y:update', updatePayload)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('canvas:attached', handleCanvasAttached)
    socket.on('canvas:detached', handleCanvasDetached)
    socket.on('y:update', handleYjsUpdate)
    socket.on('y:awareness', handleAwareness)
    doc.on('update', updateHandler)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      if (socket.connected) {
        const awarenessPayload: YjsAwarenessPayload = {
          canvasId,
          state: {},
        }
        socket.emit('y:awareness', awarenessPayload)
      }

      const detachPayload: CanvasDetachPayload = { canvasId }
      socket.emit('canvas:detach', detachPayload)
      clearCursors()

      doc.off('update', updateHandler)
      socket.off('connect', handleConnect)
      socket.off('canvas:attached', handleCanvasAttached)
      socket.off('canvas:detached', handleCanvasDetached)
      socket.off('y:update', handleYjsUpdate)
      socket.off('y:awareness', handleAwareness)
      socketRef.current = null
    }
  }, [roomId, canvasId, getSocket, status, docRef, socketRef, trackHighFreq, applyRemoteAwareness, clearCursors])
}
