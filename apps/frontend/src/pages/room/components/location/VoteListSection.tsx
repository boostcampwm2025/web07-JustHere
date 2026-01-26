import { VoteIcon, CheckCircleIcon } from '@/shared/assets'
import { Avatar, Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import type { Participant } from '@/shared/types'

// 투표 후보 장소 임시 타입
interface CandidatePlace {
  id: string
  name: string
  category: string
  distance: string
  votePercentage: number
  voters: Participant[]
  additionalVoters: number
  hasVoted: boolean
}

// 임시 목데이터 (실제 구현 시 props나 API로 대체)
const mockCandidates: CandidatePlace[] = [
  {
    id: '1',
    name: '스타벅스 강남역점',
    category: '카페',
    distance: '500m',
    votePercentage: 75,
    voters: [
      { socketId: 'socketid-1', userId: 'userId1', name: '빨간라면' },
      { socketId: 'socketid-2', userId: 'userId2', name: '파린부대찌개' },
      { socketId: 'socketid-3', userId: 'userId3', name: '초록삼겹살' },
    ],
    additionalVoters: 2,
    hasVoted: true,
  },
  {
    id: '2',
    name: '맛있는 돈까스집',
    category: '음식점',
    distance: '300m',
    votePercentage: 50,
    voters: [
      { socketId: 'socketid-4', userId: 'userId4', name: '분홍소세지' },
      { socketId: 'socketid-5', userId: 'userId5', name: '검정초밥' },
    ],
    additionalVoters: 0,
    hasVoted: false,
  },
  {
    id: '3',
    name: '이디야커피 선릉점',
    category: '카페',
    distance: '800m',
    votePercentage: 25,
    voters: [{ socketId: 'socketid-6', userId: 'userId6', name: '주황버섯' }],
    additionalVoters: 0,
    hasVoted: false,
  },
]

export const VoteListSection = () => {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        {mockCandidates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">등록된 후보가 없습니다</div>
        ) : (
          <ul className="flex flex-col gap-4">
            {mockCandidates.map((candidate, index) => (
              <li key={candidate.id} className={cn('flex flex-col gap-3 pb-4', index < mockCandidates.length - 1 && 'border-b border-gray-200')}>
                {/* 장소 정보 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-md line-clamp-1">{candidate.name}</h3>
                    <button type="button" className="text-gray-500 text-[10px] hover:text-gray-700">
                      상세보기
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {candidate.category} · {candidate.distance}
                  </p>

                  {/* 투표율 프로그레스 바 */}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${candidate.votePercentage}%` }}
                      role="progressbar"
                      aria-valuenow={candidate.votePercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`투표율 ${candidate.votePercentage}%`}
                    />
                  </div>
                </div>

                {/* 투표자 아바타 및 투표 버튼 */}
                <div className="flex items-center justify-between">
                  {/* 투표자 아바타 */}
                  <Button variant="ghost" className="px-0 rounded-full">
                    <div className="flex items-center -space-x-2">
                      {candidate.voters.map(voter => (
                        <Avatar key={voter.userId} name={voter.name} />
                      ))}
                      {candidate.additionalVoters > 0 && (
                        <div className="z-10 flex items-center justify-center -ml-2 border-2 border-white rounded-full w-9 h-9 bg-gray-100">
                          <span className="text-xs font-medium text-gray-800">+{candidate.additionalVoters}</span>
                        </div>
                      )}
                    </div>
                  </Button>
                  {/* 투표 버튼 */}
                  {candidate.hasVoted ? (
                    <Button
                      className="text-xs"
                      variant="primary_outline"
                      size="sm"
                      icon={<CheckCircleIcon className="size-3.5" />}
                      iconPosition="right"
                    >
                      투표하기
                    </Button>
                  ) : (
                    <Button className="text-xs" variant="gray" size="sm" icon={<VoteIcon className="size-3.5" />} iconPosition="right">
                      투표하기
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center gap-3 p-4">
        <Button size="lg" className="flex-1" variant="gray">
          삭제하기
        </Button>
        <Button size="lg" className="flex-1" variant="primary">
          투표 종료
        </Button>
      </div>
    </>
  )
}

export default VoteListSection
