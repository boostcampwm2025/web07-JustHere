import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { CheckIcon, VoteIcon } from '@/shared/assets'

interface Place {
  id: number
  name: string
  category: string
  votes: number
}

export const VoteStep = () => {
  const [places, setPlaces] = useState<Place[]>([
    { id: 1, name: '우방정통떡볶이', category: '한식', votes: 0 },
    { id: 2, name: '독도식당', category: '한식', votes: 0 },
    { id: 3, name: '하지메마시타', category: '일식', votes: 0 },
  ])

  const [hasVoted, setHasVoted] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null)

  const handleVote = (placeId: number) => {
    if (hasVoted) return

    const SIMULATED_TOTAL_VOTES = 3

    const currentTotalVotes = places.reduce((sum, p) => sum + p.votes, 0)

    // 1. 내가 선택한 장소에 1표 반영
    const withMyVote = places.map(p => (p.id === placeId ? { ...p, votes: p.votes + 1 } : p))

    // 2. 남은 더미 표 2표 중 1표는 내가 선택한 장소에 추가
    const extraForSelected = 1
    const withBonusForSelected = withMyVote.map(p => (p.id === placeId ? { ...p, votes: p.votes + extraForSelected } : p))

    // 3. 마지막 남은 1표는 다른 후보에게 의사 랜덤 분배
    const remaining = SIMULATED_TOTAL_VOTES - 1 - extraForSelected
    let updated = withBonusForSelected

    if (remaining > 0) {
      const otherIndexes = updated.map((p, index) => ({ p, index })).filter(({ p }) => p.id !== placeId)

      if (otherIndexes.length > 0) {
        const pseudoRandomIndex = (placeId + currentTotalVotes + updated.length) % otherIndexes.length
        const targetIndex = otherIndexes[pseudoRandomIndex].index

        updated = updated.map((p, index) => (index === targetIndex ? { ...p, votes: p.votes + remaining } : p))
      }
    }

    setSelectedPlace(placeId)
    setPlaces(updated)
    setHasVoted(true)
  }

  const totalVotes = places.reduce((sum, p) => sum + p.votes, 0)
  const winningPlace = places.reduce((max, p) => (p.votes > max.votes ? p : max), places[0])

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-32 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">투표로 장소를 결정하세요</h1>
          <p className="text-lg text-gray">
            방장은 후보 리스트로 투표를 시작할 수 있습니다.
            <br />
            최다 득표 장소가 최종 장소가 됩니다.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="w-full">
          {/* Place Cards */}
          <div className="space-y-4 mb-6">
            {places.map((place, index) => (
              <motion.div key={place.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + index * 0.1 }}>
                <div
                  className={cn(
                    'bg-white rounded-xl shadow-lg p-6 border-2 transition-all',
                    selectedPlace === place.id ? 'border-primary bg-primary-bg' : 'border-gray-bg hover:border-primary/30',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{place.name}</h3>
                      {selectedPlace === place.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <CheckIcon className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      <p className="text-sm text-gray-600">{place.category}</p>
                    </div>

                    <Button
                      onClick={() => handleVote(place.id)}
                      disabled={hasVoted}
                      className={cn(
                        'disabled:cursor-not-allowed transition-colors',
                        selectedPlace === place.id
                          ? 'bg-primary hover:bg-primary-pressed text-white'
                          : hasVoted
                            ? 'bg-gray-disable text-white'
                            : 'bg-white border-2 border-primary text-primary hover:bg-primary-bg',
                      )}
                    >
                      {selectedPlace === place.id ? (
                        <>
                          <CheckIcon className="w-4 h-4 mr-2" />
                          투표완료
                        </>
                      ) : hasVoted ? (
                        '투표완료'
                      ) : (
                        <>
                          <VoteIcon className="w-4 h-4 mr-2" />
                          투표하기
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Vote Count */}
                  <AnimatePresence>
                    {place.votes > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 border-gray-bg">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray">득표 수</span>
                            <span className="font-bold text-primary">{place.votes}표</span>
                          </div>
                          <div className="h-2 bg-gray-bg rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${(place.votes / totalVotes) * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Winner Announcement */}
          <AnimatePresence>
            {hasVoted && totalVotes >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="mb-6 bg-linear-to-br from-primary-bg to-primary/20 rounded-xl shadow-2xl p-6 flex items-center justify-center gap-4"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
                  <CheckIcon className="w-12 h-12 mx-auto mb-3 text-primary" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">투표가 완료되었습니다!</h3>
                  <p className="text-lg">
                    최종 선정된 장소: <span className="font-bold">{winningPlace.name}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}
