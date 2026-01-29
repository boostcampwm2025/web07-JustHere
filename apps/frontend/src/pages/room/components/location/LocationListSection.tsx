import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListBoxOutlineIcon, VoteIcon, PlusIcon } from '@/shared/assets'
import { Button, Divider, SearchInput, PlaceDetailContent } from '@/shared/components'
import { getPhotoUrl as getGooglePhotoUrl } from '@/shared/api'
import type { GooglePlace, Participant, PlaceCard } from '@/shared/types'
import { useLocationSearch, useVoteSocket } from '@/pages/room/hooks'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/utils'
import { RegionSelectorDropdown } from './region-selector'
import { VoteListSection } from './VoteListSection'
import { CandidateListSection } from './CandidateListSection'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { useToast } from '@/shared/hooks'

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
  slug: string
  currentRegion?: string | null
  onRegionChange?: (region: { x: number; y: number; place_name: string }) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onStartPlaceCard: (card: Omit<PlaceCard, 'x' | 'y'>) => void
  onCancelPlaceCard: () => void
  onSearchComplete?: (results: GooglePlace[]) => void
  selectedPlace: GooglePlace | null
  onPlaceSelect: (place: GooglePlace | null) => void
}

type TabType = 'locations' | 'candidates'

const getPhotoUrl = (place: GooglePlace) => {
  if (!place.photos || place.photos.length === 0) return null
  return getGooglePhotoUrl(place.photos[0].name, 200)
}

export const LocationListSection = ({
  roomId,
  userId,
  userName,
  participants,
  isOwner,
  activeCategoryId,
  slug,
  currentRegion,
  onRegionChange,
  pendingPlaceCard,
  onStartPlaceCard,
  onCancelPlaceCard,
  onSearchComplete,
  selectedPlace,
  onPlaceSelect,
}: LocationListSectionProps) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  const { searchQuery, setSearchQuery, searchResults, isLoading, isFetchingMore, hasMore, hasSearched, handleSearch, loadMoreRef } =
    useLocationSearch({
      roomId,
      onSearchComplete,
    })

  const {
    status: voteStatus,
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
    revokeVote,
    resetError,
  } = useVoteSocket({
    roomId,
    categoryId: activeCategoryId,
    userId,
    enabled: Boolean(roomId && userId),
  })

  const lastErrorKeyRef = useRef<string | null>(null)
  const joinRef = useRef(join)
  const leaveRef = useRef(leave)
  const pendingEndRef = useRef(false)
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
    return () => leaveRef.current()
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
    if (pendingEndRef.current) {
      pendingEndRef.current = false
    }
  }, [voteError, showToast, resetError])

  useEffect(() => {
    if (voteStatus !== 'COMPLETED') return
    if (!pendingEndRef.current) return

    pendingEndRef.current = false
    // navigate(`/result/${slug}`)
  }, [voteStatus, navigate, slug])

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

      castVote(candidateId)
    },
    [myVotes, castVote, revokeVote],
  )

  const handleCandidateRegister = useCallback(
    (place: GooglePlace) => {
      addCandidate({
        placeId: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        category: place.primaryTypeDisplayName?.text,
        imageUrl: getPhotoUrl(place) ?? undefined,
        rating: place.rating,
        ratingCount: place.userRatingCount,
      })
    },
    [addCandidate],
  )

  const handleViewDetail = useCallback(
    (candidateId: string) => {
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
    [voteCandidates, onPlaceSelect],
  )

  const handlePlaceSelect = (place: GooglePlace | null) => {
    onPlaceSelect(place)
  }

  const handleClear = () => {
    setSearchQuery('')
  }

  const handleAddPlaceCard = (place: GooglePlace) => {
    if (pendingPlaceCard?.placeId === place.id) {
      onCancelPlaceCard()
      return
    }

    onStartPlaceCard({
      id: `placeCard-${crypto.randomUUID()}`,
      placeId: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      createdAt: new Date().toISOString(),
      scale: 1,
      image: getPhotoUrl(place),
      category: place.primaryTypeDisplayName?.text || '',
      width: PLACE_CARD_WIDTH,
      height: PLACE_CARD_HEIGHT,
    })
  }

  const canRegisterCandidate = voteStatus === 'WAITING' && Boolean(activeCategoryId)

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'locations',
      label: '장소 리스트',
      icon: <ListBoxOutlineIcon className="w-4 h-4" />,
    },
    {
      id: 'candidates',
      label: '후보 리스트',
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
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'gray'}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 text-sm transition-colors shrink-0"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Button>
          ))}

          {/* Region Selector - 장소 리스트 탭에서만 표시 */}
          {activeTab === 'locations' && (
            <div className="ml-auto">
              <RegionSelectorDropdown currentRegion={currentRegion} slug={slug} onRegionChange={onRegionChange} />
            </div>
          )}
        </div>
        {activeTab === 'locations' && (
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClear={handleClear}
            onSearch={handleSearch}
            placeholder="검색"
          />
        )}
      </div>

      <Divider />
      {activeTab === 'locations' &&
        (selectedPlace ? (
          <PlaceDetailContent place={selectedPlace} className="flex-1" showHeader={true} onBack={() => handlePlaceSelect(null)} />
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-gray">검색 중...</div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray text-sm">
                {hasSearched ? '검색 결과가 없습니다' : '검색어를 입력하고 Enter를 눌러주세요'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {searchResults.map((place, index) => {
                  const isSelected = pendingPlaceCard?.placeId === place.id
                  const photoUrl = getPhotoUrl(place)

                  return (
                    <div key={place.id}>
                      <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                        <div
                          className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden cursor-pointer"
                          onClick={() => handlePlaceSelect(place)}
                        >
                          {photoUrl ? (
                            <img src={photoUrl} alt={place.displayName.text} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handlePlaceSelect(place)}>
                            <h3 className="font-bold text-gray-800 text-base line-clamp-1">{place.displayName.text}</h3>
                            <div className="flex items-center gap-2">
                              {place.rating && (
                                <span className="text-xs text-yellow-500 flex items-center gap-0.5">
                                  ★ {place.rating.toFixed(1)}
                                  {place.userRatingCount && <span className="text-gray-400">({place.userRatingCount})</span>}
                                </span>
                              )}
                              {place.primaryTypeDisplayName && <span className="text-gray text-xs">{place.primaryTypeDisplayName.text}</span>}
                            </div>
                            <p className="text-gray-400 text-xs line-clamp-1">{place.formattedAddress}</p>
                            {place.regularOpeningHours && (
                              <span className={cn('text-xs w-fit', place.regularOpeningHours.openNow ? 'text-green-600' : 'text-red-500')}>
                                {place.regularOpeningHours.openNow ? '영업 중' : '영업 종료'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-1">
                            <Button
                              size="sm"
                              icon={<PlusIcon className="size-3" />}
                              onClick={() => handleAddPlaceCard(place)}
                              className={cn(
                                'border transition-colors text-xs gap-1 hover:bg-primary/20 text-primary active:bg-primary/30',
                                isSelected ? 'border-primary bg-white' : 'border-transparent bg-primary-bg',
                              )}
                            >
                              캔버스
                            </Button>
                            <Button
                              variant="gray"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleCandidateRegister(place)}
                              disabled={!canRegisterCandidate}
                            >
                              후보등록
                            </Button>
                          </div>
                        </div>
                      </div>

                      {index < searchResults.length - 1 && <Divider className="mt-4" />}
                    </div>
                  )
                })}
                <div ref={loadMoreRef} />
                {isFetchingMore && <div className="text-center text-xs text-gray">더 불러오는 중...</div>}
                {!hasMore && searchResults.length > 0 && !isLoading && !isFetchingMore && (
                  <div className="text-center text-xs text-gray-400">모든 결과를 불러왔어요</div>
                )}
              </div>
            )}
          </div>
        ))}

      {/* 후보 리스트 탭 */}
      {activeTab === 'candidates' &&
        (voteStatus === 'WAITING' ? (
          <CandidateListSection
            candidates={candidateList}
            isOwner={isOwner}
            onStartVote={() => {
              if (!isOwner) return
              startVote()
            }}
            onRemoveCandidate={removeCandidate}
          />
        ) : (
          <VoteListSection
            candidates={votingCandidates}
            voteStatus={voteStatus}
            onVote={handleVote}
            onViewDetail={handleViewDetail}
            onEndVote={() => {
              pendingEndRef.current = true
              endVote()
            }}
            onResetVote={resetVote}
          />
        ))}
    </div>
  )
}
