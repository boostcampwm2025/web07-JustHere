export const VOTE_EVENTS = {
  join: 'vote:join',
  leave: 'vote:leave',
  state: 'vote:state',
  updated: 'vote:updated',
  error: 'vote:error',
  addCandidate: 'vote:candidate:add',
  cast: 'vote:cast',
  revoke: 'vote:revoke',
  start: 'vote:start',
  started: 'vote:started',
  end: 'vote:end',
  ended: 'vote:ended',
} as const

export type VoteEventName = (typeof VOTE_EVENTS)[keyof typeof VOTE_EVENTS]
