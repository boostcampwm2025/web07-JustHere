import { useEffect, useState } from 'react'

export function useSpaceKey() {
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      setIsSpacePressed(true)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (isEditableTarget(e.target)) return
      setIsSpacePressed(false)
    }

    const handleBlur = () => setIsSpacePressed(false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return { isSpacePressed }
}
