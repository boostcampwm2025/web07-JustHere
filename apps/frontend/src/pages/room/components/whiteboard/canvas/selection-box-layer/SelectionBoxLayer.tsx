import { useCanvasStore } from '@/pages/room/stores'
import { memo } from 'react'
import { Layer, Rect } from 'react-konva'

interface SelectionBoxLayerProps {
  isSelecting: boolean
}

export const SelectionBoxLayer = memo(({ isSelecting }: SelectionBoxLayerProps) => {
  const selectionBox = useCanvasStore(state => state.selectionBox)

  return (
    <Layer>
      {isSelecting && selectionBox && (
        <Rect
          x={Math.min(selectionBox.startX, selectionBox.endX)}
          y={Math.min(selectionBox.startY, selectionBox.endY)}
          width={Math.abs(selectionBox.endX - selectionBox.startX)}
          height={Math.abs(selectionBox.endY - selectionBox.startY)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Layer>
  )
})

SelectionBoxLayer.displayName = 'SelectionBoxLayer'
