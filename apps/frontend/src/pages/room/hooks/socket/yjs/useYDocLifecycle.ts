import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { Line, PlaceCard, PostIt, TextBox } from '@/shared/types'
import { CANVAS_ITEM_TYPE, YJS_TYPE } from '@/shared/types'
import { resolveZIndexState } from '@/pages/room/utils'
import type { YjsItemType, YjsRank } from '@/pages/room/types'
import { canvasSyncHandlers } from './canvasSyncHandlers'

export interface YjsSharedTypes {
  yPostits: Y.Array<Y.Map<unknown>>
  yPlaceCards: Y.Array<Y.Map<unknown>>
  yLines: Y.Array<Y.Map<unknown>>
  yTextBoxes: Y.Array<Y.Map<unknown>>
  yZRankByKey: Y.Map<YjsRank>
}

interface UseYDocLifecycleOptions {
  roomId: string
  canvasId: string
}

export const useYDocLifecycle = ({ roomId, canvasId }: UseYDocLifecycleOptions) => {
  const docRef = useRef<Y.Doc | null>(null)
  const localOriginRef = useRef(Symbol('canvas-local'))
  const localMaxTimestampRef = useRef(0)
  const [sharedTypes, setSharedTypes] = useState<YjsSharedTypes | null>(null)

  const [postits, setPostits] = useState<PostIt[]>([])
  const [placeCards, setPlaceCards] = useState<PlaceCard[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [zIndexOrder, setZIndexOrder] = useState<Array<YjsItemType>>([])

  useEffect(() => {
    const doc = new Y.Doc()
    docRef.current = doc

    const yPostits = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.POST_IT])
    const yPlaceCards = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.PLACE_CARD])
    const yLines = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.LINE])
    const yTextBoxes = doc.getArray<Y.Map<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.TEXT_BOX])
    const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)

    const nextSharedTypes: YjsSharedTypes = {
      yPostits,
      yPlaceCards,
      yLines,
      yTextBoxes,
      yZRankByKey,
    }
    setSharedTypes(nextSharedTypes)

    const { syncPostitsToState, syncPlaceCardsToState, syncLinesToState, syncTextBoxesToState, syncZIndexOrderToState } = canvasSyncHandlers({
      localMaxTimestampRef,
      setPostits,
      setPlaceCards,
      setLines,
      setTextBoxes,
      setZIndexOrder,
      resolveZIndexState,
    })(nextSharedTypes)

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
