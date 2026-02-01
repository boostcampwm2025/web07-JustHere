import { POST_IT_COLORS } from '@/pages/room/constants'
import { Tooltip } from '@/shared/components'
import { cn } from '@/shared/utils'

interface PostItColorPickerProps {
  selectedPostItIds: string[]
  currentFill?: string
  onColorChange: (color: string) => void
}

export const PostItColorPicker = ({ selectedPostItIds, currentFill, onColorChange }: PostItColorPickerProps) => {
  if (selectedPostItIds.length === 0) return null

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-2 bg-white rounded-full shadow-xl border border-gray-200">
      {POST_IT_COLORS.map(({ color, name }) => (
        <Tooltip key={name} content={name} position="bottom">
          <button
            type="button"
            aria-label={name}
            aria-pressed={color === currentFill}
            className={cn(
              'size-6 rounded-full border-2 transition-transform hover:scale-110',
              color === currentFill ? 'border-gray-400' : 'border-gray-200 hover:border-gray-400',
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
          />
        </Tooltip>
      ))}
    </div>
  )
}
