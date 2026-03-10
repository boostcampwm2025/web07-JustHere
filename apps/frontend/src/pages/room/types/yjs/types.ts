import type { Array as YArray, Map as YMap } from 'yjs'
import type { CanvasItemType } from '@/shared/types'

export type YjsRank = { timestamp: number; clientId: number }
export type YjsItemType = { type: CanvasItemType; id: string }

export type YjsSharedTypes = {
  yPostits: YArray<YMap<unknown>>
  yPlaceCards: YArray<YMap<unknown>>
  yLines: YArray<YMap<unknown>>
  yTextBoxes: YArray<YMap<unknown>>
  yZRankByKey: YMap<YjsRank>
}
