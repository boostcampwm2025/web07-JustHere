import { cn } from '@/shared/lib/cn'

interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export const Divider = ({ orientation = 'horizontal', className }: DividerProps) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn('bg-gray-200', orientation === 'horizontal' ? 'h-px w-full' : 'h-6 w-px', className)}
    />
  )
}
