import { CloseIcon, CategoryIcon, MapMarkerIcon, PhoneIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import type { Candidate } from './LocationListSection'

interface CandidateListSectionProps {
  candidates: Candidate[]
  onStartVote?: () => void
  onRemoveCandidate?: (id: string) => void
}

export const CandidateListSection = ({ candidates, onStartVote, onRemoveCandidate }: CandidateListSectionProps) => {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        {candidates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray text-sm">등록된 후보가 없습니다</div>
        ) : (
          <ul className="flex flex-col gap-4">
            {candidates.map(candidate => (
              <li key={candidate.id} className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                {/* 상단: 장소명, 거리 배지, 삭제 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-lg">{candidate.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium text-primary border border-primary rounded">{candidate.distance}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveCandidate?.(candidate.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="후보 삭제"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 상세 정보 */}
                <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-gray-400" />
                    <span>{candidate.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapMarkerIcon className="w-4 h-4 text-gray-400" />
                    <span>{candidate.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span>{candidate.phone}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Button */}
      <div className="p-4">
        <Button size="lg" className="w-full" variant="primary" onClick={onStartVote}>
          투표 시작
        </Button>
      </div>
    </>
  )
}

export default CandidateListSection
