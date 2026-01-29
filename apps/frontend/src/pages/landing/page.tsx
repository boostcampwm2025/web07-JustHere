import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StepIndicator, IntroStep, LocationRoomStep, CanvasStep, VoteStep, FinalStep, PlaceStep } from './components'

export default function LandingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [locationRoomSubStep, setLocationRoomSubStep] = useState(0)
  /**
   * 섹션 ref 배열. 인덱스는 StepIndicator 스텝 번호(1~5)와 맞춤.
   * - 0: 인트로 (인디케이터 비표시)
   * - 1: 지역+방 (인디케이터 1=지역, 2=방, locationRoomSubStep으로 구분)
   * - 2: 미사용 (인디케이터 "2"는 1번 섹션의 서브스텝 "방"이므로 별도 섹션 없음)
   * - 3~6: 캔버스(3), 장소(4), 투표(5), 최종(6) → 인디케이터 3, 4, 5 및 최종
   */
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const stepIndicatorRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const observers = sectionRefs.current.map((section, index) => {
      if (!section) return null

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              setCurrentStep(index)
            }
          })
        },
        {
          threshold: 0.5,
        },
      )

      observer.observe(section)
      return observer
    })

    return () => {
      observers.forEach(observer => observer?.disconnect())
    }
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (currentStep <= 0) {
      container.style.setProperty('--step-indicator-h', '0px')
      return
    }

    const el = stepIndicatorRef.current
    if (!el) return

    const update = () => {
      const height = el.getBoundingClientRect().height
      container.style.setProperty('--step-indicator-h', `${height}px`)
    }

    update()

    const ro = new ResizeObserver(() => update())
    ro.observe(el)

    return () => ro.disconnect()
  }, [currentStep])

  return (
    <div ref={scrollContainerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      {currentStep > 0 && (
        <div ref={stepIndicatorRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <StepIndicator
            currentStep={
              currentStep === 1
                ? locationRoomSubStep + 1 // 0→1(지역), 1→2(방)
                : Math.min(5, currentStep) // 3→3(의견), 4→4(장소), 5/6→5(투표)
            }
            isOnFinalStep={currentStep === 6}
          />
        </div>
      )}

      {/* Intro Step */}
      <div
        ref={el => {
          sectionRefs.current[0] = el
        }}
        className="min-h-screen snap-start flex items-center justify-center bg-gray-50"
      >
        <IntroStep />
      </div>

      {/* Location + Room Step */}
      <div
        ref={el => {
          sectionRefs.current[1] = el
        }}
        style={{ minHeight: 'calc(100vh - var(--step-indicator-h, 0px))', scrollMarginTop: 'var(--step-indicator-h, 0px)' }}
        className="snap-start flex items-center justify-center bg-gray-100"
      >
        <LocationRoomStep
          onSubStepChange={setLocationRoomSubStep}
          onNextStep={() => {
            const canvasSection = sectionRefs.current[3]
            if (canvasSection) {
              canvasSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        />
      </div>

      {/* Canvas Step */}
      <div
        ref={el => {
          sectionRefs.current[3] = el
        }}
        style={{ minHeight: 'calc(100vh - var(--step-indicator-h, 0px))', scrollMarginTop: 'var(--step-indicator-h, 0px)' }}
        className="snap-start flex items-center justify-center bg-white"
      >
        <CanvasStep />
      </div>

      {/* Place Step */}
      <div
        ref={el => {
          sectionRefs.current[4] = el
        }}
        style={{ minHeight: 'calc(100vh - var(--step-indicator-h, 0px))', scrollMarginTop: 'var(--step-indicator-h, 0px)' }}
        className="snap-start flex items-center justify-center bg-gray-50"
      >
        <PlaceStep />
      </div>

      {/* Vote Step */}
      <div
        ref={el => {
          sectionRefs.current[5] = el
        }}
        style={{ minHeight: 'calc(100vh - var(--step-indicator-h, 0px))', scrollMarginTop: 'var(--step-indicator-h, 0px)' }}
        className="snap-start flex items-center justify-center bg-gray-50"
      >
        <VoteStep />
      </div>

      {/* Final Step */}
      <div
        ref={el => {
          sectionRefs.current[6] = el
        }}
        style={{ minHeight: 'calc(100vh - var(--step-indicator-h, 0px))', scrollMarginTop: 'var(--step-indicator-h, 0px)' }}
        className="snap-start flex items-center justify-center bg-white relative"
      >
        <FinalStep
          onStart={() => {
            navigate('/onboarding')
          }}
        />

        {/* Footer inside last section */}
        <footer className="absolute bottom-6 left-0 right-0 text-center text-sm text-gray-disable">
          <p>© 2026 딱! 여기 - 실시간 모임 장소 결정 서비스</p>
        </footer>
      </div>
    </div>
  )
}
