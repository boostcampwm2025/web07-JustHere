import { useEffect } from 'react'
import type { Dispatch } from 'react'
import { addSocketBreadcrumb } from '@/shared/utils'
import { VOTE_EVENTS } from '@/pages/room/constants'
import type {
  VoteCandidateAddedPayload,
  VoteCandidateRemovedPayload,
  VoteCountsUpdatedPayload,
  VoteEndedPayload,
  VoteErrorPayload,
  VoteMeUpdatedPayload,
  VoteOwnerPickPayload,
  VoteParticipantLeftPayload,
  VoteResettedPayload,
  VoteRunoffPayload,
  VoteStartedPayload,
  VoteStatePayload,
  VoteSocketLike,
} from '@/pages/room/types'
import type { VoteAction } from './voteReducer'

interface UseVoteSocketEventsOptions {
  resolveSocket: () => VoteSocketLike | null
  enabled: boolean
  roomId: string
  categoryId: string
  dispatch: Dispatch<VoteAction>
  showToast: (message: string, type: 'success' | 'error') => void
  onTempCandidateClear: () => void
  onTempCandidateRemove: (placeId: string) => void
}

export function useVoteSocketEvents({
  resolveSocket,
  enabled,
  roomId,
  categoryId,
  dispatch,
  showToast,
  onTempCandidateClear,
  onTempCandidateRemove,
}: UseVoteSocketEventsOptions) {
  useEffect(() => {
    if (!enabled) return
    const socket = resolveSocket()
    if (!socket) return

    // [S->C] vote:state - join 시 초기 상태 수신
    const handleState = (payload: VoteStatePayload) => {
      dispatch({ type: 'SET_STATE', payload })
      onTempCandidateClear()
      addSocketBreadcrumb('vote:state', { roomId, status: payload.status, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:candidate:added
    const handleCandidateAdded = (payload: VoteCandidateAddedPayload) => {
      dispatch({ type: 'CANDIDATE_ADDED', candidate: payload.candidate })
      onTempCandidateRemove(payload.candidate.placeId)
    }

    // [S->C] vote:candidate:removed
    const handleCandidateRemoved = (payload: VoteCandidateRemovedPayload) => {
      dispatch({ type: 'CANDIDATE_REMOVED', placeId: payload.candidate.placeId })
      onTempCandidateRemove(payload.candidate.placeId)
    }

    // [S->C] vote:counts:updated - 투표/취소 시 브로드캐스트
    const handleCountsUpdated = (payload: VoteCountsUpdatedPayload) => {
      dispatch({ type: 'COUNTS_UPDATED', candidateId: payload.candidateId, count: payload.count, voters: payload.voters })
      addSocketBreadcrumb('vote:counts:updated', { roomId, candidateId: payload.candidateId, count: payload.count })
    }

    // [S->C] vote:me:updated - 내 투표 변경 시 (변경된 경우에만)
    const handleMeUpdated = (payload: VoteMeUpdatedPayload) => {
      dispatch({ type: 'ME_UPDATED', myVotes: payload.myVotes })
    }

    // [S->C] vote:started - 투표 시작 시 브로드캐스트
    const handleStarted = (payload: VoteStartedPayload) => {
      dispatch({ type: 'STARTED', status: payload.status })
      addSocketBreadcrumb('vote:started', { roomId })
      showToast('투표가 시작되었습니다!', 'success')
    }

    // [S->C] vote:ended - 투표 종료 시 브로드캐스트
    const handleEnded = (payload: VoteEndedPayload) => {
      dispatch({ type: 'ENDED', payload })
      addSocketBreadcrumb('vote:ended', { roomId, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:runoff - 결선 투표 시작
    const handleRunoff = (payload: VoteRunoffPayload) => {
      dispatch({ type: 'RUNOFF', payload })
      addSocketBreadcrumb('vote:runoff', { roomId, round: payload.round })
    }

    // [S->C] vote:owner-pick - 방장 최종 선택 요청
    const handleOwnerPick = (payload: VoteOwnerPickPayload) => {
      dispatch({ type: 'OWNER_PICK', payload })
      addSocketBreadcrumb('vote:owner-pick', { roomId })
    }

    // [S->C] vote:resetted - 투표 리셋 시 브로드캐스트
    const handleResetted = (payload: VoteResettedPayload) => {
      dispatch({ type: 'RESETTED', payload })
      addSocketBreadcrumb('vote:resetted', { roomId, candidatesCount: payload.candidates.length })
    }

    // [S->C] vote:participant:left - 참여자 퇴장 시 투표 취소
    const handleParticipantLeft = (payload: VoteParticipantLeftPayload) => {
      dispatch({ type: 'PARTICIPANT_LEFT', payload })
      addSocketBreadcrumb('vote:participant:left', { roomId })
    }

    // [S->C] vote:error - 에러 발생 시
    const handleError = (payload: VoteErrorPayload) => {
      if (payload.errorType === 'NO_CANDIDATES') {
        dispatch({ type: 'ROLLBACK_TO_WAITING' })
        addSocketBreadcrumb('vote:error:rollback', { roomId, errorType: payload.errorType }, 'warning')
      }
      dispatch({ type: 'SET_ERROR', error: payload })
      addSocketBreadcrumb('vote:error', { roomId, code: payload.errorType, message: payload.message }, 'error')
    }

    socket.on(VOTE_EVENTS.state, handleState)
    socket.on(VOTE_EVENTS.candidateAdded, handleCandidateAdded)
    socket.on(VOTE_EVENTS.candidateRemoved, handleCandidateRemoved)
    socket.on(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
    socket.on(VOTE_EVENTS.meUpdated, handleMeUpdated)
    socket.on(VOTE_EVENTS.started, handleStarted)
    socket.on(VOTE_EVENTS.ended, handleEnded)
    socket.on(VOTE_EVENTS.runoff, handleRunoff)
    socket.on(VOTE_EVENTS.ownerPick, handleOwnerPick)
    socket.on(VOTE_EVENTS.resetted, handleResetted)
    socket.on(VOTE_EVENTS.participantLeft, handleParticipantLeft)
    socket.on(VOTE_EVENTS.error, handleError)

    return () => {
      socket.off(VOTE_EVENTS.state, handleState)
      socket.off(VOTE_EVENTS.candidateAdded, handleCandidateAdded)
      socket.off(VOTE_EVENTS.candidateRemoved, handleCandidateRemoved)
      socket.off(VOTE_EVENTS.countsUpdated, handleCountsUpdated)
      socket.off(VOTE_EVENTS.meUpdated, handleMeUpdated)
      socket.off(VOTE_EVENTS.started, handleStarted)
      socket.off(VOTE_EVENTS.ended, handleEnded)
      socket.off(VOTE_EVENTS.runoff, handleRunoff)
      socket.off(VOTE_EVENTS.ownerPick, handleOwnerPick)
      socket.off(VOTE_EVENTS.resetted, handleResetted)
      socket.off(VOTE_EVENTS.participantLeft, handleParticipantLeft)
      socket.off(VOTE_EVENTS.error, handleError)
    }
  }, [enabled, resolveSocket, roomId, categoryId, dispatch, showToast, onTempCandidateClear, onTempCandidateRemove])
}
