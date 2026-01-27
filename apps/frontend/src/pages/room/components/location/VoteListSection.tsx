import { VoteIcon, CheckCircleIcon, StarIcon } from '@/shared/assets'
import { AvatarList, Button } from '@/shared/components'
import type { VotingCandidate } from './LocationListSection'

interface VoteListSectionProps {
  candidates: VotingCandidate[]
  onVote?: (candidateId: string) => void
  onEndVote?: () => void
  onDeleteCandidate?: () => void
}

export const VoteListSection = ({ candidates, onVote, onEndVote, onDeleteCandidate }: VoteListSectionProps) => {
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">등록된 후보가 없습니다</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {candidates.map(candidate => (
              <li key={candidate.id} className="flex flex-col gap-3 p-4">
                {/* 상단: 썸네일 + 정보 */}
                <div className="flex gap-3">
                  {/* 썸네일 이미지 */}
                  <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                    {candidate.imageUrl ? (
                      <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300" />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-800 text-base truncate">{candidate.name}</h3>
                      <button type="button" className="text-gray-500 text-[10px] hover:text-gray-700 shrink-0">
                        상세보기
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs">{candidate.category}</p>

                    {/* 리뷰 정보 */}
                    {candidate.rating !== undefined && (
                      <div className="flex items-center gap-1 mt-1">
                        <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-yellow-500">{candidate.rating.toFixed(1)}</span>
                        {candidate.userRatingCount !== undefined && (
                          <span className="text-xs text-gray-400">({candidate.userRatingCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}

                    <p className="text-gray-400 text-xs truncate mt-0.5">{candidate.address}</p>
                  </div>
                </div>

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

                {/* 투표자 아바타 및 투표 버튼 */}
                <div className="flex items-center justify-between">
                  {/* 투표자 아바타 */}
                  <Button variant="ghost" className="px-0 rounded-full">
                    <AvatarList participants={candidate.voters} />
                  </Button>
                  {/* 투표 버튼 */}
                  {candidate.hasVoted ? (
                    <Button
                      className="text-xs"
                      variant="primary_outline"
                      size="sm"
                      icon={<CheckCircleIcon className="size-3.5" />}
                      iconPosition="right"
                      onClick={() => onVote?.(candidate.id)}
                    >
                      투표하기
                    </Button>
                  ) : (
                    <Button
                      className="text-xs"
                      variant="gray"
                      size="sm"
                      icon={<VoteIcon className="size-3.5" />}
                      iconPosition="right"
                      onClick={() => onVote?.(candidate.id)}
                    >
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
        <Button size="lg" className="flex-1" variant="gray" onClick={onDeleteCandidate}>
          삭제하기
        </Button>
        <Button size="lg" className="flex-1" variant="primary" onClick={onEndVote}>
          투표 종료
        </Button>
      </div>
    </>
  )
}

export default VoteListSection
