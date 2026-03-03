import { useEffect, useRef, useState } from 'react'
import { Doc as YDoc, Map as YMap } from 'yjs'
import type { Line, PlaceCard, PostIt, TextBox } from '@/shared/types'
import { CANVAS_ITEM_TYPE, YJS_TYPE } from '@/shared/types'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { resolveZIndexState } from '@/pages/room/utils'
import type { YjsItemType, YjsRank, YjsSharedTypes } from '@/pages/room/types'

interface UseYjsDocProps {
  roomId: string
  canvasId: string
}

export const useYjsDoc = ({ roomId, canvasId }: UseYjsDocProps) => {
  const docRef = useRef<YDoc | null>(null)
  const localOriginRef = useRef(Symbol('canvas-local'))
  const localMaxTimestampRef = useRef(0)
  const [sharedTypes, setSharedTypes] = useState<YjsSharedTypes | null>(null)

  const [postits, setPostits] = useState<PostIt[]>([])
  const [placeCards, setPlaceCards] = useState<PlaceCard[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [zIndexOrder, setZIndexOrder] = useState<Array<YjsItemType>>([])

  useEffect(() => {
    const doc = new YDoc()
    docRef.current = doc

    const yPostits = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.POST_IT])
    const yPlaceCards = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.PLACE_CARD])
    const yLines = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.LINE])
    const yTextBoxes = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.TEXT_BOX])
    const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)

    const nextSharedTypes: YjsSharedTypes = {
      yPostits,
      yPlaceCards,
      yLines,
      yTextBoxes,
      yZRankByKey,
    }
    setSharedTypes(nextSharedTypes)

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

    yPostits.observeDeep(syncPostitsToState)
    yPlaceCards.observeDeep(syncPlaceCardsToState)
    yLines.observeDeep(syncLinesToState)
    yTextBoxes.observeDeep(syncTextBoxesToState)
    yZRankByKey.observe(syncZIndexOrderToState)

    syncPostitsToState()
    syncPlaceCardsToState()
    syncLinesToState()
    syncTextBoxesToState()
    syncZIndexOrderToState()

    return () => {
      yPostits.unobserveDeep(syncPostitsToState)
      yPlaceCards.unobserveDeep(syncPlaceCardsToState)
      yLines.unobserveDeep(syncLinesToState)
      yTextBoxes.unobserveDeep(syncTextBoxesToState)
      yZRankByKey.unobserve(syncZIndexOrderToState)
      setSharedTypes(null)
      doc.destroy()
      docRef.current = null
    }
  }, [roomId, canvasId])

  return {
    docRef,
    localOriginRef,
    localMaxTimestampRef,
    sharedTypes,
    postits,
    placeCards,
    lines,
    textBoxes,
    zIndexOrder,
  }
}
