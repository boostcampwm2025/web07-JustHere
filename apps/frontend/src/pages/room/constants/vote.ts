export const VOTE_EVENTS = {
  join: 'vote:join',
  leave: 'vote:leave',
  state: 'vote:state',
  error: 'vote:error',
  addCandidate: 'vote:candidate:add',
  removeCandidate: 'vote:candidate:remove',
  candidateUpdated: 'vote:candidate:updated',
  cast: 'vote:cast',
  revoke: 'vote:revoke',
  countsUpdated: 'vote:counts:updated',
  meUpdated: 'vote:me:updated',
  start: 'vote:start',
  started: 'vote:started',
  end: 'vote:end',
  ended: 'vote:ended',
  runoff: 'vote:runoff',
  ownerPick: 'vote:owner-pick',
  ownerSelect: 'vote:owner-select',
} as const

export type VoteEventName = (typeof VOTE_EVENTS)[keyof typeof VOTE_EVENTS]
