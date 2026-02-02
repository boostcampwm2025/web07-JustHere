import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResultNotFoundError, ResultLoadFailedError } from '@/app/error-boundary'
import { ArrowLeftIcon, ShareVariantIcon, PartyPopperIcon, CheckIcon } from '@/shared/assets'
import { Button, Header, type PlaceDetailPlace } from '@/shared/components'
import { socketBaseUrl } from '@/shared/config/socket'
import { useRoomParticipants, useRoomMeta, useVoteResults } from '@/shared/hooks'
import { getOrCreateStoredUser } from '@/shared/utils'
import { useRoomSocket } from '@/pages/room/hooks'
import { RoomHeader } from '@/pages/room/components'
import { PlaceResultCard } from './components'

export const ResultPage = () => {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const { roomId, ready, updateParticipantName, transferOwner } = useRoomSocket()

  const [copied, setCopied] = useState(false)

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)
  const { data: voteResults, isLoading, isFetching, error } = useVoteResults(roomId || '', ready)

  const resultData: PlaceDetailPlace[] = useMemo(() => {
    if (!voteResults || voteResults.length === 0) return []
    return voteResults.flatMap(item =>
      item.result.map(candidate => ({
        id: candidate.placeId,
        displayName: {
          text: candidate.name,
          languageCode: 'ko',
        },
        formattedAddress: candidate.address,
      })),
    )
  }, [voteResults])

  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId

  const roomLink = `${socketBaseUrl}/result/${slug}`

  const handleGoBack = () => {
    navigate(`/room/${slug}`)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(roomLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('링크 복사에 실패했습니다.', error)
    }
  }

  if (!user || !roomId) return null

  if (isLoading || isFetching) {
    return (
      <div className="flex flex-col h-screen bg-gray-bg">
        <Header />
      </div>
    )
  }

  if (error) {
    throw new ResultLoadFailedError()
  }

  if (!isLoading && !isFetching && !resultData.length) {
    throw new ResultNotFoundError()
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <RoomHeader
        participants={participants}
        currentUserId={user.userId}
        roomLink={roomLink}
        onUpdateName={updateParticipantName}
        isOwner={isOwner}
        ownerId={ownerId}
        onTransferOwner={transferOwner}
      />
      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 min-h-0 overflow-hidden">
        {/* Back Button */}
        <button type="button" onClick={handleGoBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 w-fit">
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm">이전 페이지로 돌아가기</span>
        </button>

        {/* Title Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">최종 선택 결과</h1>
              <span className="flex items-center gap-1 px-3 py-1 bg-red-50 text-primary text-sm font-medium rounded-full">
                <PartyPopperIcon className="w-4 h-4" />
                투표 완료
              </span>
            </div>
            <p className="text-gray-500">투표를 통해 가장 많은 선택을 받은 장소입니다. 상세 정보를 확인하세요.</p>
          </div>
          <div className="text-sm text-gray-600">
            총 참여 인원 <span className="font-bold text-gray-900">{participants.length}명</span>
          </div>
        </div>

        {/* Place Cards */}
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 min-h-0">
          {resultData.map(place => (
            <PlaceResultCard key={place.id} place={place} />
          ))}
        </div>

        {/* Footer Button */}
        <div className="flex justify-end mt-6">
          <Button
            size="lg"
            variant="primary"
            icon={copied ? <CheckIcon className="w-5 h-5 text-white" /> : <ShareVariantIcon className="w-5 h-5 text-white" />}
            iconPosition="right"
            onClick={handleShare}
          >
            결과 공유하기
          </Button>
        </div>
      </main>
    </div>
  )
}
