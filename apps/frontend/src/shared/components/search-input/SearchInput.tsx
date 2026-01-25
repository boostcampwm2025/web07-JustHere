import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from 'react'
import { MagnifyIcon, CloseIcon, Button } from '@/shared/ui'
import { cn } from '@/shared/utils'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  onSearch?: () => void
  containerClassName?: string
}

export const SearchInput = ({ value, onChange, onClear, onSearch, onKeyDown, className, containerClassName, ...props }: SearchInputProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (!event.defaultPrevented && event.key === 'Enter') {
      onSearch?.()
    }
  }

  return (
    <div className={cn('relative', containerClassName)}>
      <MagnifyIcon className="size-5 absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray hover:text-black" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-12 pl-12 pr-12 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary',
          className,
        )}
        {...props}
      />
      {value && (
        <Button
          icon={<CloseIcon className="size-5" />}
          size="icon"
          variant="ghost"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
        />
      )}
    </div>
  )
}
