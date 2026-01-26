import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils'

type Variant = 'primary' | 'gray' | 'ghost' | 'outline'
type Size = 'icon' | 'sm' | 'md' | 'lg'
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const BASE_STYLES =
  'flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-lg'

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-pressed active:bg-primary-pressed/90 focus-visible:ring-primary focus-visible:ring-offset-white',
  gray: 'bg-gray-100 text-gray hover:bg-gray-disable/20 active:bg-gray-disable/30 focus-visible:ring-gray',
  ghost: 'text-gray hover:bg-gray-bg active:bg-gray-disable/10 focus-visible:ring-gray',
  outline: 'border border-gray-200 text-gray-700 hover:bg-gray-100 focus-visible:ring-gray',
}

const SIZE_STYLES: Record<Size, string> = {
  icon: 'h-fit w-fit p-2',
  sm: 'h-9 w-fit px-4 text-sm gap-1.5',
  md: 'h-11 w-fit px-6 text-base gap-2',
  lg: 'h-12 w-full text-base gap-2',
}

export const Button = ({ className, variant = 'primary', size = 'md', icon, iconPosition = 'left', children, ...props }: ButtonProps) => {
  return (
    <button className={cn(BASE_STYLES, VARIANT_STYLES[variant], SIZE_STYLES[size], className)} {...props}>
      {iconPosition === 'left' && icon && <span className="shrink-0">{icon}</span>}
      {children}
      {iconPosition === 'right' && icon && <span className="shrink-0">{icon}</span>}
    </button>
  )
}
