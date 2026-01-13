import { useCallback, useEffect } from 'react'
import { useRoomStore } from '@/stores/room.store'
import type { RoomJoinPayload, RoomJoinedPayload, ParticipantConnectedPayload, ParticipantDisconnectedPayload } from '@/types/socket'
import { useSocketClient } from './useSocket'

export function useRoomSocket() {
  const { status, connect, getSocket } = useSocketClient({
    namespace: 'room',
    autoConnect: false,
  })

  const setJoined = useRoomStore(s => s.setJoined)
  const addParticipant = useRoomStore(s => s.addParticipant)
  const removeParticipant = useRoomStore(s => s.removeParticipant)
  const reset = useRoomStore(s => s.reset)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onJoined = (p: RoomJoinedPayload) => setJoined(p)
    const onConnected = (p: ParticipantConnectedPayload) => addParticipant(p)
    const onDisconnected = (p: ParticipantDisconnectedPayload) => removeParticipant(p)
    const onDisconnect = () => reset()

    socket.on('room:joined', onJoined)
    socket.on('participant:connected', onConnected)
    socket.on('participant:disconnected', onDisconnected)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('room:joined', onJoined)
      socket.off('participant:connected', onConnected)
      socket.off('participant:disconnected', onDisconnected)
      socket.off('disconnect', onDisconnect)
    }
  }, [getSocket, setJoined, addParticipant, removeParticipant, reset])

  const joinRoom = useCallback(
    (roomId: string, user: { userId: string; name: string }) => {
      connect()
      const socket = getSocket()
      if (!socket) return

      const payload: RoomJoinPayload = { roomId, user }

      if (socket.connected) {
        socket.emit('room:join', payload)
        return
      }

      socket.once('connect', () => socket.emit('room:join', payload))
    },
    [connect, getSocket],
  )

  const leaveRoom = useCallback(() => {
    const socket = getSocket()
    if (socket?.connected) socket.emit('room:leave')

    reset()
  }, [getSocket, reset])

  return { status, joinRoom, leaveRoom }
}
