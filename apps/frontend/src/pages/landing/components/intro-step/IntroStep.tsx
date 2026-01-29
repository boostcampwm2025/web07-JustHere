import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/shared/utils/cn'
import { MapCheckOutlineIcon, NoteTextIcon, LogoKo, AccountCheckOutlineIcon, ChevronDownIcon, ArrowRightIcon } from '@/shared/assets'
import { Button } from '@/shared/components'

const FEATURES = [
  {
    icon: MapCheckOutlineIcon,
    title: '연결된 모임 선택 과정',
    description: '의견 공유부터 장소 탐색까지 한 곳에서 해결합니다.',
  },
  {
    icon: NoteTextIcon,
    title: '실시간 협업 캔버스',
    description: '포스트잇과 장소 카드로 의견을 자유롭게 공유합니다.',
  },
  {
    icon: AccountCheckOutlineIcon,
    title: '자유로운 방 생성',
    description: '로그인 없이 누구나 방을 생성하고 참여할 수 있습니다.',
  },
]

export const IntroStep = () => {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex(prev => (prev + 1) % FEATURES.length)
    }, 3000) // 3초마다 자동 슬라이드

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        {/* Top Section: Logo/Title and Features Slider */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-16 mb-16">
          <div className="flex items-start w-full lg:w-fit justify-between">
            {/* Logo, Main Title and Problem Statement */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 100 }}
              className="flex-1 text-left"
            >
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <LogoKo className="w-80 h-fit" />
                <p className="py-2 text-xl lg:text-2xl text-gray mb-2">실시간으로 모임 장소를 함께 정하는 서비스</p>

                {/* Problem Statement */}
                <div className="inline-block text-left py-4">
                  <p className="text-xl text-gray leading-relaxed">
                    <span className="font-bold text-2xl text-primary">"어디서 만날까?"</span>
                    <span className="mt-3 block text-base">메신저에서 의견 나누고, 지도 검색하고, 따로 투표 만들고...</span>
                    <span className="mt-1 block text-base">너무 복잡하지 않으셨나요?</span>
                  </p>
                </div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex justify-center mt-28 pl-8"
            >
              <Button
                onClick={() => navigate('/onboarding')}
                iconPosition="right"
                icon={
                  <motion.div className="ml-2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <ArrowRightIcon className="w-6 h-6" />
                  </motion.div>
                }
                className="px-10 py-3 h-fit shadow-lg text-lg font-bold lg:px-4 lg:py-2 lg:text-base"
              >
                시작하기
              </Button>
            </motion.div>
          </div>

          {/* Features Slider */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex-1 w-full lg:w-auto">
            <div className="relative h-64 lg:h-72">
              <AnimatePresence mode="wait">
                {FEATURES.map((feature, index) => {
                  if (index !== currentFeatureIndex) return null
                  const Icon = feature.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-gray-bg hover:border-primary transition-all hover:shadow-2xl h-full flex flex-col items-center justify-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-bg flex items-center justify-center">
                          <Icon className="size-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                        <p className="text-gray text-center">{feature.description}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {FEATURES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeatureIndex(index)}
                  className={cn('w-2 h-2 rounded-full transition-all', index === currentFeatureIndex ? 'bg-primary w-8' : 'bg-gray-disable')}
                  aria-label={`Feature ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* How It Works Timeline */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              이제{' '}
              <span className="font-extrabold bg-primary-bg">
                딱! <span className="text-primary">여기</span>
              </span>
              에서 모두 해결하세요!
            </h2>
            <span className="text-gray">총 5단계로 완성되는 모임 장소 결정</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, text: '지역 선택하기' },
              { step: 2, text: '방 생성하기' },
              { step: 3, text: '의견 공유하기' },
              { step: 4, text: '장소 탐색하기' },
              { step: 5, text: '투표하기' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6 + index * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-xl shadow-md p-4 border-2 border-gray-bg hover:border-primary transition-all">
                  <div className="size-8 mx-auto mb-2 rounded-full bg-primary text-white flex items-center justify-center font-bold">{item.step}</div>
                  <p className="font-semibold text-lg text-center">{item.text}</p>
                </div>
                {index < 4 && <div className="hidden md:block absolute top-1/2 -right-4 w-4 h-0.5 bg-gray-300"></div>}
              </motion.div>
            ))}
          </div>
          <p className="my-8 text-center text-gray">지금부터 각 단계를 직접 체험하며 사용법을 익혀보세요!</p>
          <div className="text-gray-disable text-sm flex flex-col items-center gap-1">
            <span>아래로 스크롤하여 시작하기</span>
            <ChevronDownIcon className="size-4" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
