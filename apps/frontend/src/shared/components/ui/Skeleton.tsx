import { cn } from '@/shared/utils'

interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
}
