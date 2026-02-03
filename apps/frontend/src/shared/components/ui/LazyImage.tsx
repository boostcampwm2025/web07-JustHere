import { useState, useRef, useEffect } from 'react'
import { cn } from '@/shared/utils'
import { Skeleton } from './Skeleton'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  rootMargin?: string
}

export const LazyImage = ({ src, alt, className, rootMargin = '100px' }: LazyImageProps) => {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {!isLoaded && <Skeleton className="absolute inset-0" />}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={cn('w-full h-full object-cover transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}
