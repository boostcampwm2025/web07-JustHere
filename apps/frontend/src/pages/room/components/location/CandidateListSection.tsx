import { CloseIcon, StarIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import type { Candidate } from './LocationListSection'

interface CandidateListSectionProps {
  candidates: Candidate[]
  isOwner?: boolean
  onStartVote?: () => void
  onRemoveCandidate?: (id: string) => void
}

export const CandidateListSection = ({ candidates, isOwner = false, onStartVote, onRemoveCandidate }: CandidateListSectionProps) => {
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">등록된 후보가 없습니다</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {candidates.map(candidate => (
              <li key={candidate.id} className="flex gap-3 p-4 hover:bg-gray-50 transition-colors">
                {/* 썸네일 이미지 */}
                <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                  {candidate.imageUrl ? (
                    <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300" />
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-bold text-gray-800 text-base truncate">{candidate.name}</h3>
                    {candidate.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-yellow-500">{candidate.rating.toFixed(1)}</span>
                        {candidate.userRatingCount !== undefined && (
                          <span className="text-xs text-gray-400">({candidate.userRatingCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                    <p className="text-gray-400 text-xs truncate">{candidate.address}</p>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <Button onClick={() => onRemoveCandidate?.(candidate.id)} variant="ghost" size="icon" className="p-0" aria-label="후보 삭제">
                  <CloseIcon className="w-5 h-5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Button */}
      {isOwner && (
        <div className="p-4">
          <Button size="lg" className="w-full" variant="primary" onClick={onStartVote}>
            투표 시작
          </Button>
        </div>
      )}
    </>
  )
}
