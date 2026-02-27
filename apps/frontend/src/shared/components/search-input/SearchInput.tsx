import { useState, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { MagnifyIcon, CloseIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch: (searchValue: string) => void
  onClear: () => void
  containerClassName?: string
}

export const SearchInput = ({ onSearch, onClear, onKeyDown, className, containerClassName }: SearchInputProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (event.nativeEvent.isComposing) {
      return
    }
    if (!event.defaultPrevented && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      onSearch(searchQuery)
    }
  }

  const handleClear = () => {
    onClear()
    setSearchQuery('')
  }

  return (
    <div className={cn('relative', containerClassName)}>
      <MagnifyIcon className="size-5 absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray hover:text-black" />
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-12 pl-12 pr-12 bg-gray-bg border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-disable focus:outline-none focus:border-primary',
          className,
        )}
      />
      {searchQuery && (
        <Button
          icon={<CloseIcon className="size-5" />}
          size="icon"
          variant="ghost"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
        />
      )}
    </div>
  )
}
