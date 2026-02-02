import { useState, useRef, useCallback } from 'react'
import { cn } from '@/shared/utils'
import { Button } from './Button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/assets'

interface ImageSliderProps {
  images: { src: string; alt: string }[]
  className?: string
  imageClassName?: string
  showIndicators?: boolean
  maxIndicators?: number
}

export const ImageSlider = ({ images, className, imageClassName, showIndicators = true, maxIndicators = 5 }: ImageSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const safeIndex = Math.min(currentIndex, images.length - 1)

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : prev))
  }, [images.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
    setTranslateX(0)
  }, [])

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return
      const diff = clientX - startX
      setTranslateX(diff)
    },
    [isDragging, startX],
  )

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const threshold = 50
    if (translateX > threshold && currentIndex > 0) {
      goToPrevious()
    } else if (translateX < -threshold && currentIndex < images.length - 1) {
      goToNext()
    }
    setTranslateX(0)
  }, [isDragging, translateX, currentIndex, images.length, goToPrevious, goToNext])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd()
    }
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  if (images.length === 0) return null

  const showPrevButton = safeIndex > 0
  const showNextButton = safeIndex < images.length - 1

  return (
    <div className={cn('relative overflow-hidden select-none', className)} ref={containerRef}>
      {/* Image Container */}
      <div
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out h-full"
          style={{
            transform: `translateX(calc(-${safeIndex * 100}% + ${isDragging ? translateX : 0}px))`,
            transition: isDragging ? 'none' : 'transform 300ms ease-out',
          }}
        >
          {images.map((image, idx) => (
            <img key={idx} src={image.src} alt={image.alt} className={cn('w-full h-full object-cover shrink-0', imageClassName)} draggable={false} />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          {showPrevButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5"
              aria-label="이전 이미지"
              icon={<ChevronLeftIcon className="size-4" />}
            />
          )}
          {showNextButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5"
              aria-label="다음 이미지"
              icon={<ChevronRightIcon className="size-4" />}
            />
          )}
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.slice(0, maxIndicators).map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`이미지 ${idx + 1} 보기`}
              onClick={() => goToSlide(idx)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors hover:cursor-pointer',
                idx === safeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70',
              )}
            />
          ))}
          {images.length > maxIndicators && <span className="text-white text-xs ml-1">+{images.length - maxIndicators}</span>}
        </div>
      )}
    </div>
  )
}
