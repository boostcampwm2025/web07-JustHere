import type { VoteEventName } from '@/pages/room/constants'

type Handler<T = unknown> = (payload: T) => void

export type VoteSocketEventName = VoteEventName | 'connect' | 'disconnect'

export interface VoteSocketLike {
  connected: boolean
  connect: () => void
  disconnect: () => void
  on: <T = unknown>(event: VoteSocketEventName, handler: Handler<T>) => void
  off: <T = unknown>(event: VoteSocketEventName, handler: Handler<T>) => void
  emit: <T = unknown>(event: VoteEventName, payload?: T) => void
}
