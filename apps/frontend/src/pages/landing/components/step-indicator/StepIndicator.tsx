import { motion } from 'motion/react'
import { Logo } from '@/shared/assets'
import { cn } from '@/shared/utils/cn'

const STEPS = [
  { step: 1, label: '지역 선택하기' },
  { step: 2, label: '방 만들기' },
  { step: 3, label: '의견 공유하기' },
  { step: 4, label: '장소 탐색하기' },
  { step: 5, label: '투표하기' },
]

interface StepIndicatorProps {
  currentStep: number
}

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-4">
      <div className="flex items-center gap-6">
        <div className="shrink-0 flex items-center">
          <Logo className="h-8 w-auto" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            {STEPS.map(step => {
              const isActive = step.step === currentStep
              const isCompleted = step.step < currentStep

              return (
                <div key={step.step} className="flex items-center w-full">
                  <div className="flex flex-col items-center w-full">
                    <motion.div
                      className={cn(
                        'size-8 rounded-full flex items-center justify-center border-2',
                        isCompleted && 'bg-primary border-primary',
                        isActive && !isCompleted && 'bg-white border-primary',
                        !isActive && !isCompleted && 'bg-white border-gray-disable',
                      )}
                      initial={false}
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span
                        className={cn(
                          'font-bold',
                          isCompleted && 'text-white',
                          isActive && !isCompleted && 'text-primary',
                          !isActive && !isCompleted && 'text-gray-disable',
                        )}
                      >
                        {step.step}
                      </span>
                    </motion.div>
                    <p
                      className={cn(
                        'mt-2 text-sm font-medium',
                        (isActive || isCompleted) && 'text-gray-text',
                        !isActive && !isCompleted && 'text-gray-disable',
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  {step.step < currentStep && (
                    <div className="flex-1 h-0.5 mx-2 bg-gray-bg relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isCompleted ? 1 : 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
