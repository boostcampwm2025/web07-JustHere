import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ShareVariantIcon, PartyPopperIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { socketBaseUrl } from '@/shared/config/socket'
import { PlaceResultCard } from './components/PlaceResultCard'
import { useRoomSocketCache } from '../room/hooks'
import { useRoomParticipants, useRoomMeta } from '@/shared/hooks'
import { getOrCreateStoredUser } from '@/shared/utils'
import { RoomHeader } from '../room/components'

// Mock 데이터 - 최종 선택된 장소들
interface ResultPlace {
  id: string
  name: string
  placeId: string // 카카오 place id
}

const mockResultPlaces: ResultPlace[] = [
  {
    id: '1',
    name: '서현실비',
    placeId: '20400283',
  },
  {
    id: '2',
    name: '서머셋 센트럴 분당 더카라',
    placeId: '635421084',
  },
  {
    id: '3',
    name: '굿웨더',
    placeId: '620893242',
  },
]

export const ResultPage = () => {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const { joinRoom, leaveRoom, roomId, updateParticipantName, transferOwner } = useRoomSocketCache()

  const { data: participants = [] } = useRoomParticipants(roomId)
  const { data: roomMeta } = useRoomMeta(roomId)

  const ownerId = roomMeta?.ownerId
  const isOwner = !!user && ownerId === user.userId

  const roomLink = `${socketBaseUrl}/result/${slug}`

  useEffect(() => {
    if (!slug || !user) return
    joinRoom(slug, user)
    return () => leaveRoom()
  }, [joinRoom, leaveRoom, slug, user])

  const handleGoBack = () => {
    navigate(`/room/${slug}`)
  }

  const handleShare = () => {
    // TODO: 결과 공유 로직
    console.log('Share result')
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
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
      <main className="flex-1 flex flex-col p-8">
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
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {mockResultPlaces.map(place => (
            <PlaceResultCard key={place.id} place={place} />
          ))}
        </div>

        {/* Footer Button */}
        <div className="flex justify-end mt-6">
          <Button size="lg" variant="primary" icon={<ShareVariantIcon className="size-4.5" />} iconPosition="right" onClick={handleShare}>
            결과 공유하기
          </Button>
        </div>
      </main>
    </div>
  )
}
