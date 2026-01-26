import { VoteIcon, CheckCircleIcon } from '@/shared/assets'
import { AvatarList, Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
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
      <div className="flex-1 overflow-y-auto p-4">
        {candidates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">등록된 후보가 없습니다</div>
        ) : (
          <ul className="flex flex-col gap-4">
            {candidates.map((candidate, index) => (
              <li key={candidate.id} className={cn('flex flex-col gap-3 pb-4', index < candidates.length - 1 && 'border-b border-gray-200')}>
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
