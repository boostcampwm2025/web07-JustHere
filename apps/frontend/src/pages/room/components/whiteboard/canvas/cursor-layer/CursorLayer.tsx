import { memo } from 'react'
import { Layer } from 'react-konva'
import { useCursorPresenceStore } from '@/pages/room/stores'
import { AnimatedCursor } from './animated-cursor'

export const CursorLayer = memo(() => {
  const cursors = useCursorPresenceStore(state => state.cursors)

  return (
    <Layer>
      {Array.from(cursors.values()).map(cursor => (
        <AnimatedCursor key={cursor.socketId} cursor={cursor} />
      ))}
    </Layer>
  )
})

CursorLayer.displayName = 'CursorLayer'
