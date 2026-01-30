import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MagnifyIcon, MapCheckOutlineIcon, CloseIcon, ArrowRightIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { PLACE_TUTORIAL_STEPS } from '@/pages/landing/constants'
import { usePlaceSearch, usePlaceTutorial, usePlaceState } from '@/pages/landing/hooks'

export const PlaceStep = () => {
  const { searchQuery, setSearchQuery, searchResults } = usePlaceSearch()
  const { tutorialStep, setTutorialStep, showTutorial, setShowTutorial, handleTutorialNext, handleTutorialPrev } = usePlaceTutorial()
  const {
    canvasPlaces,
    candidates,
    viewMode,
    setViewMode,
    selectedPlace,
    setSelectedPlace,
    placeDetailRef,
    addToCanvas,
    addToCandidate,
    removeFromCandidate,
  } = usePlaceState()

  useEffect(() => {
    if (tutorialStep === 0 && searchQuery === '') {
      const timer = setTimeout(() => setSearchQuery('떡볶이'), 100)
      return () => clearTimeout(timer)
    }
  }, [tutorialStep, searchQuery, setSearchQuery])

  const handleTutorialAction = () => {
    const currentStep = PLACE_TUTORIAL_STEPS[tutorialStep]

    switch (currentStep.action) {
      case 'search':
        if (searchQuery && searchResults.length > 0) {
          handleTutorialNext()
        }
        break
      case 'addToCanvas':
        if (canvasPlaces.length === 0 && searchResults.length > 0) {
          addToCanvas(searchResults[0])
        }
        handleTutorialNext()
        break
      case 'addToCandidate':
        if (candidates.length === 0 && searchResults.length > 0) {
          addToCandidate(searchResults[0])
        }
        handleTutorialNext()
        break
      case 'viewMap':
        setViewMode('map')
        handleTutorialNext()
        break
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">장소를 찾고 후보에 추가하세요</h1>
          <p className="text-lg text-gray">키워드로 장소를 검색하고 캔버스나 후보 리스트에 추가할 수 있습니다.</p>
        </motion.div>

        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 bg-white rounded-xl p-1 border-2 border-gray-100">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-4 py-2 rounded-lg transition-colors text-sm font-semibold',
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-gray hover:bg-gray-100',
                  )}
                >
                  장소 리스트
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'px-4 py-2 rounded-lg transition-all text-sm font-semibold',
                    viewMode === 'map' ? 'bg-primary text-white' : 'text-gray hover:bg-gray-100',
                    tutorialStep === 3 && showTutorial && 'ring-4 ring-primary ring-offset-2 animate-pulse',
                  )}
                >
                  지도
                </button>
                <button
                  onClick={() => setViewMode('candidates')}
                  className={cn(
                    'px-4 py-2 rounded-lg transition-all text-sm font-semibold',
                    viewMode === 'candidates' ? 'bg-primary text-white' : 'text-gray hover:bg-gray-100',
                    candidates.length === 0 && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                  )}
                  disabled={candidates.length === 0}
                >
                  후보 리스트
                </button>
              </div>

              {!showTutorial && (
                <Button
                  onClick={() => {
                    setTutorialStep(0)
                    setShowTutorial(true)
                  }}
                  className="shrink-0 bg-white border-2 border-gray-100 text-gray-text px-4 py-2 rounded-xl hover:bg-gray-100"
                >
                  튜토리얼 다시보기
                </Button>
              )}
            </div>

            {viewMode === 'list' && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={cn('mb-4 relative', tutorialStep === 0 && showTutorial && 'ring-4 ring-primary ring-offset-2 rounded-xl')}
              >
                <div className="relative">
                  <MagnifyIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="떡볶이"
                    className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray hover:text-black"
                      aria-label="검색어 지우기"
                    >
                      <CloseIcon className="size-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden" style={{ height: '500px' }}>
              {viewMode === 'list' ? (
                <div className="h-full overflow-y-auto p-4">
                  {searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((place, index) => (
                        <motion.div
                          key={place.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-primary transition-colors"
                        >
                          <div className="flex gap-4">
                            <div className="w-24 h-24 bg-linear-to-br from-primary-bg to-white rounded-lg shrink-0 flex items-center justify-center">
                              <MapCheckOutlineIcon className="size-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-1 truncate">{place.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-500">★</span>
                                  <span className="font-semibold">{place.rating}</span>
                                  <span className="text-xs text-gray">({place.reviews})</span>
                                </div>
                                <span className="text-sm text-gray">{place.category}</span>
                              </div>
                              <p className="text-sm text-gray truncate">{place.address}</p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => addToCanvas(place)}
                                className={cn(
                                  'px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                  canvasPlaces.includes(place.id)
                                    ? 'bg-gray-100 text-gray cursor-default'
                                    : 'bg-primary-bg text-primary hover:bg-primary hover:text-white',
                                  tutorialStep === 1 && showTutorial && index === 0 && 'ring-4 ring-primary ring-offset-2 animate-pulse',
                                )}
                                disabled={canvasPlaces.includes(place.id)}
                              >
                                {canvasPlaces.includes(place.id) ? '캔버스 ✓' : '+ 캔버스'}
                              </button>
                              <button
                                onClick={() => addToCandidate(place)}
                                className={cn(
                                  'px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                  candidates.some(c => c.place.id === place.id)
                                    ? 'bg-gray-100 text-gray cursor-default'
                                    : 'bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white',
                                  tutorialStep === 2 && showTutorial && index === 0 && 'ring-4 ring-primary ring-offset-2 animate-pulse',
                                )}
                                disabled={candidates.some(c => c.place.id === place.id)}
                              >
                                {candidates.some(c => c.place.id === place.id) ? '후보등록 ✓' : '후보등록'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <MagnifyIcon className="size-16 text-gray-disable mx-auto mb-4" />
                        <p className="text-gray">{searchQuery ? '검색 결과가 없습니다' : '키워드를 입력해 장소를 검색하세요'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'map' ? (
                <div className="h-full relative">
                  <div className="absolute inset-0 bg-linear-to-br from-gray-100 via-white to-primary-bg">
                    <div className="absolute inset-0 opacity-10">
                      <div className="grid grid-cols-8 grid-rows-8 h-full">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <div key={i} className="border border-gray" />
                        ))}
                      </div>
                    </div>
                    {searchResults.map((place, index) => (
                      <motion.button
                        key={place.id}
                        initial={{ scale: 0, y: -50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: 'spring' }}
                        onClick={() => setSelectedPlace(place)}
                        className="absolute transform -translate-x-1/2 -translate-y-full group"
                        style={{
                          left: `${30 + index * 15}%`,
                          top: `${40 + (index % 2) * 20}%`,
                        }}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <MapCheckOutlineIcon className="size-6 text-white" />
                          </div>
                          <div className="w-1 h-4 bg-primary mx-auto" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">{place.name}</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3">
                    <p className="text-sm text-gray">
                      <span className="font-bold text-primary">{searchResults.length}개</span>
                      {candidates.length > 0 ? '의 후보지' : '의 검색 결과'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  <div className="space-y-3">
                    {candidates.length > 0 ? (
                      candidates.map((candidate, index) => (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-bg rounded-xl p-3 group relative"
                        >
                          <button
                            type="button"
                            onClick={() => removeFromCandidate(candidate.id)}
                            className="absolute -top-2 -right-2 size-6 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`${candidate.place.name} 후보에서 제거`}
                          >
                            <CloseIcon className="size-3 text-white" />
                          </button>
                          <div className="w-full text-left">
                            <h4 className="font-bold mb-1 pr-6">{candidate.place.name}</h4>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-sm">★</span>
                                <span className="text-sm font-semibold">{candidate.place.rating}</span>
                              </div>
                              <span className="text-xs text-gray">{candidate.place.category}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <MapCheckOutlineIcon className="size-12 text-gray-disable mx-auto mb-3" />
                          <p className="text-sm text-gray">아직 후보가 없습니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-80">
            <AnimatePresence mode="wait">
              {showTutorial ? (
                <motion.div
                  key="tutorial"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="sticky top-24 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-1">
                        {PLACE_TUTORIAL_STEPS.map((_, index) => (
                          <div
                            key={index}
                            className={cn('h-1.5 rounded-full transition-all', index === tutorialStep ? 'w-8 bg-primary' : 'w-1.5 bg-gray-200')}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTutorial(false)}
                        className="text-gray hover:text-black transition-colors"
                        aria-label="튜토리얼 닫기"
                      >
                        <CloseIcon className="size-4" />
                      </button>
                    </div>
                    <motion.div key={tutorialStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <div className="mb-6">
                        <div className="text-sm text-gray mb-2">
                          Step {tutorialStep + 1} / {PLACE_TUTORIAL_STEPS.length}
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{PLACE_TUTORIAL_STEPS[tutorialStep].title}</h3>
                        <p className="text-gray leading-relaxed">{PLACE_TUTORIAL_STEPS[tutorialStep].description}</p>
                      </div>
                      {tutorialStep < PLACE_TUTORIAL_STEPS.length - 1 && (
                        <Button onClick={handleTutorialAction} className="w-full py-3 mb-3">
                          {tutorialStep === 0 && '검색하기'}
                          {tutorialStep === 1 && '캔버스에 추가'}
                          {tutorialStep === 2 && '후보에 등록'}
                          {tutorialStep === 3 && '지도 보기'}
                          <ArrowRightIcon className="size-4 ml-2" />
                        </Button>
                      )}
                      {tutorialStep === PLACE_TUTORIAL_STEPS.length - 1 && (
                        <Button onClick={() => setShowTutorial(false)} className="w-full bg-primary hover:bg-primary-pressed text-white py-3 mb-3">
                          튜토리얼 완료
                        </Button>
                      )}
                      <div className="flex gap-2">
                        {tutorialStep > 0 && (
                          <Button onClick={handleTutorialPrev} variant="gray" size="lg" className="flex-1 h-fit py-2.5">
                            이전
                          </Button>
                        )}
                        {tutorialStep < PLACE_TUTORIAL_STEPS.length - 1 && (
                          <Button onClick={handleTutorialNext} variant="gray" size="lg" className="flex-1 h-fit py-2.5">
                            건너뛰기
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="sticky top-24 bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 text-sm text-gray">
                    <h3 className="text-lg font-bold mb-3">뷰 전환 안내</h3>
                    <p className="mb-2">
                      서비스에서는 <span className="font-semibold text-primary">캔버스 / 지도</span> 뷰와{' '}
                      <span className="font-semibold text-primary">장소 리스트 / 후보 리스트</span> 뷰를 전환할 수 있습니다.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            ref={placeDetailRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="h-32 bg-linear-to-br from-primary-bg to-white flex items-center justify-center">
                <MapCheckOutlineIcon className="size-16 text-primary" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedPlace.name}</h2>
                    <p className="text-sm text-gray mb-1">{selectedPlace.category}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★★★★</span>
                        <span className="font-bold text-sm">{selectedPlace.rating}</span>
                      </div>
                      <span className="text-xs text-gray">({selectedPlace.reviews}개 리뷰)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlace(null)}
                    className="text-gray hover:text-black transition-colors"
                    aria-label="장소 상세 닫기"
                  >
                    <CloseIcon className="size-5" />
                  </button>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray mb-3">{selectedPlace.address}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      addToCanvas(selectedPlace)
                      setSelectedPlace(null)
                    }}
                    className="flex-1 bg-primary-bg text-primary hover:bg-primary hover:text-white py-2.5"
                  >
                    캔버스에 추가
                  </Button>
                  <Button
                    onClick={() => {
                      addToCandidate(selectedPlace)
                      setSelectedPlace(null)
                    }}
                    className="flex-1 bg-primary text-white hover:bg-primary-pressed py-2.5"
                  >
                    후보 등록
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
