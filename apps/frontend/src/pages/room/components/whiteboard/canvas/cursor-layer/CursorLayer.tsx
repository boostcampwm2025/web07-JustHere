import { memo } from 'react'
import { Layer } from 'react-konva'
import { AnimatedCursor } from './animated-cursor'
import { useCursorPresence } from '@/pages/room/hooks'

export const CursorLayer = memo(() => {
  const { cursors } = useCursorPresence({ subscribe: true })

  return (
    <Layer>
      {Array.from(cursors.values()).map(cursor => (
        <AnimatedCursor key={cursor.socketId} cursor={cursor} />
      ))}
    </Layer>
  )
})

CursorLayer.displayName = 'CursorLayer'
