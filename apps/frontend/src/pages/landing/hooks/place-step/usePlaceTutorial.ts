import { useState } from 'react'
import { PLACE_TUTORIAL_STEPS } from '@/pages/landing/constants'

export function usePlaceTutorial() {
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true)

  const handleTutorialNext = () => {
    if (tutorialStep < PLACE_TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1)
    } else {
      setShowTutorial(false)
    }
  }

  const handleTutorialPrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1)
    }
  }

  return {
    tutorialStep,
    setTutorialStep,
    showTutorial,
    setShowTutorial,
    handleTutorialNext,
    handleTutorialPrev,
  }
}
