import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftIcon, CheckIcon, ContentCopyIcon, MagnifyIcon, MapMarkerIcon } from '@/shared/assets'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components'

const SAMPLE_LOCATIONS = [
  { name: '강남', lat: 37.4979, lng: 127.0276 },
  { name: '신논현', lat: 37.5045, lng: 127.0254 },
  { name: '홍대입구', lat: 37.5563, lng: 126.9236 },
  { name: '여의도', lat: 37.5219, lng: 126.9245 },
]

interface LocationRoomStepProps {
  onSubStepChange?: (subStep: number) => void
  onNextStep?: () => void
}

export const LocationRoomStep = ({ onSubStepChange, onNextStep }: LocationRoomStepProps) => {
  const [step, setStep] = useState(0) // 0: location, 1: room
  const [selectedLocation, setSelectedLocation] = useState<string>('강남')
  const [typingText, setTypingText] = useState('')
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const roomLink = 'http://justhere.p-e.kr/room/justroom'

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
  }

  const handleNext = useCallback(() => {
    if (step < 1) {
      setStep(step + 1)
    }
  }, [step])

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(step - 1)
    }
  }, [step])

  const handleCopy = () => {
    navigator.clipboard.writeText(roomLink)
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => {
      setCopied(false)
      copiedTimerRef.current = null
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    onSubStepChange?.(step)
  }, [step, onSubStepChange])

  useEffect(() => {
    const text = selectedLocation ?? ''
    let index = 0

    const timer = setInterval(() => {
      index += 1
      setTypingText(text.slice(0, index))

      if (index >= text.length) {
        clearInterval(timer)
      }
    }, 120)

    return () => clearInterval(timer)
  }, [selectedLocation])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, handleNext, handlePrev])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 py-12">
      {/* Content Container with horizontal slide */}
      <div className="w-full max-w-4xl mx-auto relative">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {/* Location Step Content */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4">만날 지역을 선택해보세요</h1>
                <p className="text-lg text-gray">
                  모두가 접근하기 편한 지역을 검색하세요. <br /> 지역은 나중에 변경할 수 있습니다.
                </p>
              </div>

              <div className="w-full p-8 bg-white rounded-2xl shadow-2xl border-2 border-gray-bg">
                {/* Map Preview */}
                <div className="relative mb-6 rounded-2xl overflow-hidden">
                  <div className="bg-linear-to-br from-primary-bg to-white h-96 flex items-center justify-center relative">
                    {/* Mock Map */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="grid grid-cols-8 grid-rows-8 h-full">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <div key={i} className="border border-gray-disable/10" />
                        ))}
                      </div>
                    </div>

                    {/* Location Markers */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="relative z-10"
                    >
                      <MapMarkerIcon className="w-16 h-16 text-primary drop-shadow-lg" />
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                        <p className="font-bold text-black">{selectedLocation}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Search Bar Overlay */}
                  <div className="absolute top-4 left-4 right-4">
                    <div className="relative">
                      <div className="flex items-center gap-2 font-semibold w-full p-4 bg-white shadow-lg rounded-xl text-gray">
                        <MagnifyIcon className="size-5" />
                        <p>{typingText}</p>
                      </div>

                      {/* Quick Selection Chips */}
                      <div className="flex gap-2 flex-wrap mt-3">
                        {SAMPLE_LOCATIONS.map(loc => (
                          <motion.button
                            key={loc.name}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleLocationSelect(loc.name)}
                            className={cn(
                              'px-4 py-2 rounded-full border-2 transition-colors',
                              selectedLocation === loc.name
                                ? 'bg-primary border-primary text-white'
                                : 'bg-white border-gray-bg text-gray hover:border-primary',
                            )}
                          >
                            {loc.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <Button onClick={handleNext} size="lg" className="h-fit py-4 text-lg font-bold">
                  장소 선택하기
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {/* Room Step Content */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4">방이 생성되었습니다</h1>
                <p className="text-lg text-gray">
                  친구들에게 링크를 공유해 초대해보세요.
                  <br />
                  로그인 없이 누구나 이용할 수 있습니다.
                </p>
              </div>

              <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border-2 border-gray-bg p-8">
                {/* Room Link Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-primary-bg rounded-xl p-6 mb-6"
                >
                  <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border-2 border-primary/20">
                    <input type="text" value={roomLink} readOnly className="flex-1 bg-transparent outline-none text-gray font-mono text-sm" />
                    <Button
                      onClick={handleCopy}
                      className={cn('transition-colors text-white', copied ? 'bg-primary-pressed' : 'bg-primary hover:bg-primary-pressed')}
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="size-4 mr-2" />
                          복사완료
                        </>
                      ) : (
                        <>
                          <ContentCopyIcon className="size-4 mr-2" />
                          복사하기
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handlePrev} size="lg" variant="gray" className=" h-fit py-3 text-lg font-bold">
                    <ArrowLeftIcon className="size-5 mr-2" />
                    이전
                  </Button>
                  <Button onClick={() => onNextStep?.()} size="lg" className="h-fit py-3 text-lg font-bold">
                    시작하기
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-gray-disable text-sm flex items-center gap-4"
      >
        <span>키보드 ← → 또는 버튼으로 이동</span>
      </motion.div>
    </div>
  )
}
