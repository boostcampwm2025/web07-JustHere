import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ListBoxOutlineIcon, VoteIcon } from '@/shared/assets'
import { ChipButton, Divider, SearchInput, PlaceDetailContent, Modal } from '@/shared/components'
import type { GooglePlace, Participant, PlaceCard } from '@/shared/types'
import { useVoteSocket, useLocationSearch } from '@/pages/room/hooks'
import { VoteListSection } from './VoteListSection'
import { CandidateListSection } from './CandidateListSection'
import { PlaceItemSkeleton } from './PlaceItemSkeleton'
import { PlaceList } from './PlaceList'
import { useToast } from '@/shared/hooks'
import type { TabType } from '@/pages/room/types/location'

// 후보 장소 기본 타입 (GooglePlace 기반)
export interface Candidate {
  id: string
  name: string
  category: string
  address: string
  phone?: string
  imageUrl?: string
  rating?: number
  userRatingCount?: number
}

// 투표 중 후보 장소 타입 (투표 정보 포함)
export interface VotingCandidate extends Candidate {
  votePercentage: number
  voters: Participant[]
  hasVoted: boolean
}

interface LocationListSectionProps {
  roomId: string
  userId: string
  userName: string
  participants: Participant[]
  isOwner: boolean
  activeCategoryId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  onSearchComplete?: (results: GooglePlace[]) => void
  activeTab: TabType
  onActiveTabChange: (tab: TabType) => void
  onCandidatePlaceIdsChange?: (candidateIds: string[]) => void
  selectedPlace: GooglePlace | null
  onPlaceSelect: (place: GooglePlace | null) => void
  candidatePlaces?: GooglePlace[]
  isLoadingDetail?: boolean
}

export const LocationListSection = ({
  roomId,
  userId,
  userName,
  participants,
  isOwner,
  activeCategoryId,
  pendingPlaceCard,
  onStartPlaceCard,
  onCancelPlaceCard,
  onSearchComplete,
  activeTab,
  onActiveTabChange,
  onCandidatePlaceIdsChange,
  selectedPlace,
  onPlaceSelect,
  candidatePlaces = [],
  isLoadingDetail = false,
}: LocationListSectionProps) => {
  const { showToast } = useToast()

  const {
    status: voteStatus,
    singleVote,
    round,
    selectedCandidateId,
    candidates: voteCandidates,
    counts: voteCounts,
    myVotes,
    votersByCandidate,
    error: voteError,
    join,
    leave,
    addCandidate,
    removeCandidate,
    startVote,
    endVote,
    resetVote,
    castVote,
    recastVote,
    revokeVote,
    ownerSelect,
    resetError,
  } = useVoteSocket({
    roomId,
    categoryId: activeCategoryId,
    userId,
    enabled: Boolean(roomId && userId),
  })

  const {
    searchResults,
    isLoading: isSearchLoading,
    isFetchingMore,
    hasMore,
    hasSearched,
    handleSearch,
    clearSearch,
    loadMoreRef,
  } = useLocationSearch({
    roomId,
    categoryId: activeCategoryId,
    onSearchComplete,
  })

  const lastErrorKeyRef = useRef<string | null>(null)
  const joinRef = useRef(join)
  const leaveRef = useRef(leave)
  const currentParticipant = useMemo<Participant>(() => {
    const existing = participants.find(p => p.userId === userId)
    if (existing) return existing

    return { socketId: '', userId, name: userName }
  }, [participants, userId, userName])

  useEffect(() => {
    joinRef.current = join
    leaveRef.current = leave
  }, [join, leave])

  useEffect(() => {
    if (!roomId || !userId || !activeCategoryId) return
    joinRef.current()
    return () => leaveRef.current({ disconnect: false })
  }, [roomId, userId, activeCategoryId])

  useEffect(() => {
    if (!voteError) {
      lastErrorKeyRef.current = null
      return
    }

    const nextKey = `${voteError.errorType}:${voteError.message}`
    if (lastErrorKeyRef.current === nextKey) return

    lastErrorKeyRef.current = nextKey
    showToast(voteError.message, 'error')
    resetError()
  }, [voteError, showToast, resetError])

  useEffect(() => {
    onCandidatePlaceIdsChange?.(voteCandidates.map(candidate => candidate.placeId))
  }, [voteCandidates, onCandidatePlaceIdsChange])

  const candidateList = useMemo<Candidate[]>(() => {
    return voteCandidates.map(candidate => ({
      id: candidate.placeId,
      name: candidate.name,
      category: candidate.category ?? '',
      address: candidate.address,
      phone: candidate.phone,
      imageUrl: candidate.imageUrl,
      rating: candidate.rating,
      userRatingCount: candidate.ratingCount,
    }))
  }, [voteCandidates])

  const totalVoters = useMemo(() => {
    const voterIds = new Set<string>()
    for (const list of Object.values(votersByCandidate)) {
      for (const id of list) {
        voterIds.add(id)
      }
    }
    return voterIds.size
  }, [votersByCandidate])

  const votingCandidates = useMemo<VotingCandidate[]>(() => {
    return voteCandidates.map(candidate => {
      const count = voteCounts[candidate.placeId] ?? 0
      const hasVoted = myVotes.includes(candidate.placeId)
      const voters = (votersByCandidate[candidate.placeId] ?? [])
        .map(voterId => participants.find(p => p.userId === voterId) ?? (voterId === userId ? currentParticipant : null))
        .filter((value): value is Participant => value !== null)
      const votePercentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0

      return {
        id: candidate.placeId,
        name: candidate.name,
        category: candidate.category ?? '',
        address: candidate.address,
        phone: candidate.phone,
        imageUrl: candidate.imageUrl,
        rating: candidate.rating,
        userRatingCount: candidate.ratingCount,
        votePercentage,
        voters,
        hasVoted,
      }
    })
  }, [voteCandidates, voteCounts, totalVoters, myVotes, votersByCandidate, participants, userId, currentParticipant])

  const handleVote = useCallback(
    (candidateId: string) => {
      if (myVotes.includes(candidateId)) {
        revokeVote(candidateId)
        return
      }

      if (singleVote && myVotes.length > 0) {
        // 기존 투표를 취소하고 새로운 후보에 투표 (자동 스위칭)
        const prevCandidateId = myVotes[0]
        recastVote(prevCandidateId, candidateId)
        return
      }

      castVote(candidateId)
    },
    [myVotes, singleVote, castVote, revokeVote, recastVote],
  )

  const handleViewDetail = useCallback(
    (candidateId: string) => {
      const resolved = candidatePlaces?.find(p => p.id === candidateId)
      if (resolved) {
        onPlaceSelect(resolved)
        return
      }

      const candidate = voteCandidates.find(item => item.placeId === candidateId)
      if (!candidate) return

      onPlaceSelect({
        id: candidate.placeId,
        displayName: { text: candidate.name, languageCode: 'ko' },
        formattedAddress: candidate.address,
        location: { latitude: 0, longitude: 0 },
        rating: candidate.rating,
        userRatingCount: candidate.ratingCount,
        primaryTypeDisplayName: candidate.category ? { text: candidate.category, languageCode: 'ko' } : undefined,
      })
    },
    [voteCandidates, onPlaceSelect, candidatePlaces],
  )

  const candidatePlaceIds = useMemo(() => voteCandidates.map(c => c.placeId), [voteCandidates])

  const handleClear = useCallback(() => {
    clearSearch()
  }, [clearSearch])

  const canRegisterCandidate = voteStatus === 'WAITING' && Boolean(activeCategoryId)

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'locations',
      label: '장소 검색',
      icon: <ListBoxOutlineIcon className="w-4 h-4" />,
    },
    {
      id: 'candidates',
      label: '투표 목록',
      icon: <VoteIcon className="w-4 h-4" />,
    },
  ]

  return (
    <div className="flex flex-col w-[420px] h-full bg-white border-l border-gray-200">
      {/* Header Section */}
      <div className="flex flex-col gap-4 p-5 pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <ChipButton key={tab.id} icon={tab.icon} selected={activeTab === tab.id} onClick={() => onActiveTabChange(tab.id)}>
              {tab.label}
            </ChipButton>
          ))}
        </div>
        {activeTab === 'locations' && <SearchInput onClear={handleClear} onSearch={handleSearch} placeholder="검색" />}
      </div>

      <Divider />
      {isLoadingDetail ? (
        <div className="flex-1 flex flex-col p-5 gap-4">
          <PlaceItemSkeleton />
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-32 bg-gray-200 rounded w-full animate-pulse mt-4" />
          </div>
        </div>
      ) : selectedPlace ? (
        <PlaceDetailContent place={selectedPlace} className="flex-1" showHeader={true} onBack={() => onPlaceSelect(null)} />
      ) : (
        activeTab === 'locations' && (
          <PlaceList
            searchResults={searchResults}
            isLoading={isSearchLoading}
            isFetchingMore={isFetchingMore}
            hasMore={hasMore}
            hasSearched={hasSearched}
            loadMoreRef={loadMoreRef}
            pendingPlaceCard={pendingPlaceCard}
            onStartPlaceCard={onStartPlaceCard}
            onCancelPlaceCard={onCancelPlaceCard}
            candidatePlaceIds={candidatePlaceIds}
            canRegisterCandidate={canRegisterCandidate}
            onPlaceSelect={onPlaceSelect}
            onAddCandidate={addCandidate}
            onRemoveCandidate={removeCandidate}
          />
        )
      )}

      {/* 후보 리스트 탭 */}
      {!selectedPlace &&
        !isLoadingDetail &&
        activeTab === 'candidates' &&
        (voteStatus === 'WAITING' ? (
          <CandidateListSection
            candidates={candidateList}
            isOwner={isOwner}
            onStartVote={() => {
              if (!isOwner || !candidateList.length) return
              startVote()
            }}
            onRemoveCandidate={removeCandidate}
          />
        ) : (
          <VoteListSection
            candidates={votingCandidates}
            round={round}
            isOwner={isOwner}
            voteStatus={voteStatus}
            selectedCandidateId={selectedCandidateId}
            onVote={handleVote}
            onViewDetail={handleViewDetail}
            onEndVote={endVote}
            onResetVote={resetVote}
          />
        ))}

      {/* 방장 최종 선택 Modal */}
      {!selectedPlace && !isLoadingDetail && voteStatus === 'OWNER_PICK' && (
        <Modal title={isOwner ? '최종 장소를 선택해주세요' : '방장이 최종 선택 중입니다'} onClose={() => {}}>
          <Modal.Body>
            {!isOwner ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-gray-500 text-sm text-center">
                  결선 투표에서도 동률이 발생했습니다.
                  <br />
                  방장이 최종 장소를 선택하고 있습니다...
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-gray-500 text-sm mb-2">결선 투표에서도 동률이 발생했습니다. 최종 장소를 선택해주세요.</p>
                {votingCandidates.map(candidate => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary-bg transition-colors text-left"
                    onClick={() => ownerSelect(candidate.id)}
                  >
                    <div className="w-14 h-14 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                      {candidate.imageUrl ? (
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 truncate">{candidate.name}</h4>
                      <p className="text-xs text-gray-500">{candidate.category}</p>
                      {candidate.rating !== undefined && <span className="text-xs text-yellow-500">★ {candidate.rating.toFixed(1)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Modal.Body>
        </Modal>
      )}
    </div>
  )
}
