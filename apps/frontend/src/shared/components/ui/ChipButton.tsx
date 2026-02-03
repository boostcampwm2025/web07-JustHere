import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils'

type Variant = 'default' | 'selected'
type Size = 'sm' | 'md'

export interface ChipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  selected?: boolean
}

const BASE_STYLES = 'flex items-center rounded-full font-medium'

const VARIANT_STYLES: Record<Variant, string> = {
  default: 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm',
  selected: 'bg-primary-bg text-primary border-2 border-primary',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
}

export const ChipButton = ({ className, variant, size = 'md', icon, selected = false, children, ...props }: ChipButtonProps) => {
  const resolvedVariant = variant ?? (selected ? 'selected' : 'default')

  return (
    <button type="button" className={cn(BASE_STYLES, VARIANT_STYLES[resolvedVariant], SIZE_STYLES[size], className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
