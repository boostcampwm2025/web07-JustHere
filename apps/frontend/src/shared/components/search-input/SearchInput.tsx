import { useState, useImperativeHandle, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react'
import { MagnifyIcon, CloseIcon } from '@/shared/assets'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils'

export interface SearchInputHandle {
  setValue: (value: string) => void
}

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<SearchInputHandle>
  onSearch: (searchValue: string) => void
  onClear: () => void
  onInputChange?: (value: string) => void
  containerClassName?: string
}

export const SearchInput = ({ ref, onSearch, onClear, onInputChange, onKeyDown, className, containerClassName }: SearchInputProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  useImperativeHandle(ref, () => ({
    setValue: (value: string) => {
      setSearchQuery(value)
    },
  }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onInputChange?.(value)
  }

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
        onChange={handleChange}
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
