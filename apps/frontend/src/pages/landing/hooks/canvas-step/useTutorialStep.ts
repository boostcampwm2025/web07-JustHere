import { useEffect, useState } from 'react'
import type { TutorialCursor } from '@/pages/landing/types'
import { CANVAS_TUTORIAL_STEPS } from '@/pages/landing/constants'

export function useTutorialStep() {
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true)
  const [otherCursors, setOtherCursors] = useState<TutorialCursor[]>([])
  const [cursorChat, setCursorChat] = useState<{ cursorId: string; text: string } | null>(null)

  useEffect(() => {
    if (tutorialStep === 3 && showTutorial) {
      const cursors: TutorialCursor[] = [
        { id: '1', name: '지민', x: 200, y: 150, color: '#FF6B6B' },
        { id: '2', name: '수현', x: 450, y: 200, color: '#4ECDC4' },
      ]

      const initTimer = setTimeout(() => setOtherCursors(cursors), 0)
      const interval = setInterval(() => {
        setOtherCursors(prev =>
          prev.map(cursor => ({
            ...cursor,
            x: cursor.x + (Math.random() - 0.5) * 50,
            y: cursor.y + (Math.random() - 0.5) * 50,
          })),
        )
      }, 2000)

      return () => {
        clearTimeout(initTimer)
        clearInterval(interval)
      }
    } else {
      const clearTimer = setTimeout(() => setOtherCursors([]), 0)
      return () => clearTimeout(clearTimer)
    }
  }, [tutorialStep, showTutorial])

  useEffect(() => {
    if (!(tutorialStep === 3 && showTutorial)) return

    let hideTimer: number | undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      setCursorChat({ cursorId: '1', text: '여기 괜찮아 보여요!' })
      if (hideTimer) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setCursorChat(null), 3000)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [tutorialStep, showTutorial])

  const handleTutorialNext = () => {
    if (tutorialStep < CANVAS_TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1)
    } else {
      setShowTutorial(false)
    }
  }

  const handleTutorialPrev = () => {
    setTutorialStep(prev => (prev > 0 ? prev - 1 : prev))
  }

  return {
    tutorialStep,
    setTutorialStep,
    showTutorial,
    setShowTutorial,
    otherCursors,
    cursorChat,
    handleTutorialNext,
    handleTutorialPrev,
  }
}
