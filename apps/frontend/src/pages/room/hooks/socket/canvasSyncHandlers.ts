import type { Array as YArray, Map as YMap } from 'yjs'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Line, PlaceCard, PostIt, TextBox } from '@/shared/types'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import type { YjsItemType, YjsRank } from '@/pages/room/types'

interface SyncBindings {
  yPostits: YArray<YMap<unknown>>
  yPlaceCards: YArray<YMap<unknown>>
  yLines: YArray<YMap<unknown>>
  yTextBoxes: YArray<YMap<unknown>>
  yZRankByKey: YMap<YjsRank>
}

interface SyncHandlers {
  syncPostitsToState: () => void
  syncPlaceCardsToState: () => void
  syncLinesToState: () => void
  syncTextBoxesToState: () => void
  syncZIndexOrderToState: () => void
}

interface CanvasSyncHandlersOptions {
  localMaxTimestampRef: RefObject<number>
  setPostits: Dispatch<SetStateAction<PostIt[]>>
  setPlaceCards: Dispatch<SetStateAction<PlaceCard[]>>
  setLines: Dispatch<SetStateAction<Line[]>>
  setTextBoxes: Dispatch<SetStateAction<TextBox[]>>
  setZIndexOrder: Dispatch<SetStateAction<YjsItemType[]>>
  resolveZIndexState: (
    rankByKey: YMap<YjsRank>,
    currentMaxTimestamp: number,
  ) => {
    items: YjsItemType[]
    maxTimestamp: number
  }
}

export const canvasSyncHandlers = ({
  localMaxTimestampRef,
  setPostits,
  setPlaceCards,
  setLines,
  setTextBoxes,
  setZIndexOrder,
  resolveZIndexState,
}: CanvasSyncHandlersOptions) => {
  return ({ yPostits, yPlaceCards, yLines, yTextBoxes, yZRankByKey }: SyncBindings): SyncHandlers => {
    const syncPostitsToState = () => {
      const items: PostIt[] = yPostits.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        scale: yMap.get('scale') as number,
        fill: yMap.get('fill') as string,
        text: yMap.get('text') as string,
        authorName: yMap.get('authorName') as string,
      }))
      setPostits(items)
    }

    const syncPlaceCardsToState = () => {
      const items: PlaceCard[] = yPlaceCards.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        placeId: yMap.get('placeId') as string,
        name: yMap.get('name') as string,
        address: yMap.get('address') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: (yMap.get('width') as number | undefined) ?? PLACE_CARD_WIDTH,
        height: (yMap.get('height') as number | undefined) ?? PLACE_CARD_HEIGHT,
        scale: yMap.get('scale') as number,
        createdAt: yMap.get('createdAt') as string,
        image: (yMap.get('image') as string | null | undefined) ?? null,
        category: (yMap.get('category') as string | undefined) ?? '',
        rating: yMap.get('rating') as number | undefined,
        userRatingCount: yMap.get('userRatingCount') as number | undefined,
      }))
      setPlaceCards(items)
    }

    const syncLinesToState = () => {
      const items: Line[] = yLines.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        points: (yMap.get('points') as number[]) || [],
        stroke: yMap.get('stroke') as string,
        strokeWidth: yMap.get('strokeWidth') as number,
        tension: yMap.get('tension') as number,
        lineCap: yMap.get('lineCap') as 'round' | 'butt' | 'square',
        lineJoin: yMap.get('lineJoin') as 'round' | 'bevel' | 'miter',
        tool: yMap.get('tool') as 'pen',
      }))
      setLines(items)
    }

    const syncTextBoxesToState = () => {
      const items: TextBox[] = yTextBoxes.toArray().map(yMap => ({
        id: yMap.get('id') as string,
        x: yMap.get('x') as number,
        y: yMap.get('y') as number,
        width: yMap.get('width') as number,
        height: yMap.get('height') as number,
        scale: yMap.get('scale') as number,
        text: yMap.get('text') as string,
        authorName: yMap.get('authorName') as string,
      }))
      setTextBoxes(items)
    }

    const syncZIndexOrderToState = () => {
      const { items, maxTimestamp } = resolveZIndexState(yZRankByKey, localMaxTimestampRef.current)
      localMaxTimestampRef.current = maxTimestamp
      setZIndexOrder(items)
    }

    return {
      syncPostitsToState,
      syncPlaceCardsToState,
      syncLinesToState,
      syncTextBoxesToState,
      syncZIndexOrderToState,
    }
  }
}
