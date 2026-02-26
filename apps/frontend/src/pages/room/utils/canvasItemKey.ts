import { CANVAS_ITEM_TYPE, type CanvasItemType } from '@/shared/types'
import type { YjsItemType } from '@/pages/room/types'

export const makeKey = (type: CanvasItemType, id: string) => `${type}:${id}`

export const parseKey = (key: string): YjsItemType | null => {
  const idx = key.indexOf(':')
  if (idx === -1 || idx === 0) return null

  const type = key.slice(0, idx) as CanvasItemType
  const id = key.slice(idx + 1)

  if (!id || !Object.values(CANVAS_ITEM_TYPE).includes(type)) {
    return null
  }

  return { type, id }
}
