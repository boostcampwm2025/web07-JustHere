import { motion } from 'motion/react'
import { ArrowLeftIcon, LogoKo } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

interface FinalStepProps {
  onStart: () => void
}

export const FinalStep = ({ onStart }: FinalStepProps) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-32 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Logo and Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          <LogoKo className="w-80 h-fit mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">이제 시작할 준비가 되었어요!</h1>
          <p className="text-xl text-gray">모임 장소를 쉽고 빠르게 결정하세요</p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="w-full max-w-2xl mx-auto space-y-4"
        >
          <Button
            onClick={onStart}
            className={cn(
              'w-full py-8 text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all group',
              'bg-primary hover:bg-primary-pressed text-white',
            )}
          >
            <span>지금 시작하기</span>
            <motion.div className="inline-block ml-2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ArrowLeftIcon className="w-6 h-6 -scale-x-100" />
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
