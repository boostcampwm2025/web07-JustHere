import { useCallback } from 'react'
import { Map as YMap, Doc as YDoc, UndoManager as YUndoManager } from 'yjs'
import { YJS_TYPE, CANVAS_ITEM_TYPE, type CanvasItemType, type Line, type PlaceCard, type PostIt, type TextBox } from '@/shared/types'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import type { YjsRank } from '@/pages/room/types'
import { assignNextRank, makeKey, shouldSkipMoveToTop } from '@/pages/room/utils'

type RefValue<T> = { current: T }

interface UseYjsCommandsProps {
  docRef: RefValue<YDoc | null>
  undoManagerRef: RefValue<YUndoManager | null>
  localOriginRef: RefValue<unknown>
  localMaxTimestampRef: RefValue<number>
  updateHistoryState: () => void
}

export const useYjsCommands = ({ docRef, undoManagerRef, localOriginRef, localMaxTimestampRef, updateHistoryState }: UseYjsCommandsProps) => {
  const updateItem = useCallback(
    (canvasItemType: CanvasItemType, id: string, updates: Record<string, unknown>) => {
      const doc = docRef.current
      if (!doc) return

      const yArray = doc.getArray<YMap<unknown>>(YJS_TYPE[canvasItemType])
      const idToIndexMap = new Map<string, number>()
      yArray.forEach((yMap, index) => {
        const itemId = yMap.get('id') as string
        if (itemId) {
          idToIndexMap.set(itemId, index)
        }
      })

      const index = idToIndexMap.get(id)
      if (index === undefined) return

      doc.transact(() => {
        const yMap = yArray.get(index)
        Object.entries(updates).forEach(([key, value]) => {
          yMap.set(key, value)
        })
      }, localOriginRef.current)
    },
    [docRef, localOriginRef],
  )

  const addPostIt = useCallback(
    (postit: PostIt) => {
      const doc = docRef.current
      if (!doc) return

      const yPostits = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.POST_IT])
      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)
      const yMap = new YMap()
      yMap.set('id', postit.id)
      yMap.set('x', postit.x)
      yMap.set('y', postit.y)
      yMap.set('width', postit.width)
      yMap.set('height', postit.height)
      yMap.set('scale', postit.scale)
      yMap.set('fill', postit.fill)
      yMap.set('text', postit.text)
      yMap.set('authorName', postit.authorName)

      doc.transact(() => {
        yPostits.push([yMap])
        localMaxTimestampRef.current = assignNextRank(
          yZRankByKey,
          makeKey(CANVAS_ITEM_TYPE.POST_IT, postit.id),
          localMaxTimestampRef.current,
          doc.clientID,
        )
      }, localOriginRef.current)
    },
    [docRef, localMaxTimestampRef, localOriginRef],
  )

  const updatePostIt = useCallback(
    (id: string, updates: Partial<Omit<PostIt, 'id'>>) => {
      updateItem(CANVAS_ITEM_TYPE.POST_IT, id, updates)
    },
    [updateItem],
  )

  const addPlaceCard = useCallback(
    (card: PlaceCard) => {
      const doc = docRef.current
      if (!doc) return

      const yPlaceCards = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.PLACE_CARD])
      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)
      const yMap = new YMap()
      yMap.set('id', card.id)
      yMap.set('placeId', card.placeId)
      yMap.set('name', card.name)
      yMap.set('address', card.address)
      yMap.set('x', card.x)
      yMap.set('y', card.y)
      yMap.set('width', card.width ?? PLACE_CARD_WIDTH)
      yMap.set('height', card.height ?? PLACE_CARD_HEIGHT)
      yMap.set('scale', card.scale ?? 1)
      yMap.set('createdAt', card.createdAt)
      yMap.set('image', card.image ?? null)
      yMap.set('category', card.category ?? '')
      if (card.rating !== undefined) yMap.set('rating', card.rating)
      if (card.userRatingCount !== undefined) yMap.set('userRatingCount', card.userRatingCount)

      doc.transact(() => {
        yPlaceCards.push([yMap])
        localMaxTimestampRef.current = assignNextRank(
          yZRankByKey,
          makeKey(CANVAS_ITEM_TYPE.PLACE_CARD, card.id),
          localMaxTimestampRef.current,
          doc.clientID,
        )
      }, localOriginRef.current)
    },
    [docRef, localMaxTimestampRef, localOriginRef],
  )

  const updatePlaceCard = useCallback(
    (id: string, updates: Partial<Omit<PlaceCard, 'id'>>) => {
      updateItem(CANVAS_ITEM_TYPE.PLACE_CARD, id, updates)
    },
    [updateItem],
  )

  const addLine = useCallback(
    (line: Line) => {
      const doc = docRef.current
      if (!doc) return

      const yLines = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.LINE])
      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)
      const yMap = new YMap()
      yMap.set('id', line.id)
      yMap.set('points', line.points)
      yMap.set('stroke', line.stroke)
      yMap.set('strokeWidth', line.strokeWidth)
      yMap.set('tension', line.tension)
      yMap.set('lineCap', line.lineCap)
      yMap.set('lineJoin', line.lineJoin)
      yMap.set('tool', line.tool)

      doc.transact(() => {
        yLines.push([yMap])
        localMaxTimestampRef.current = assignNextRank(
          yZRankByKey,
          makeKey(CANVAS_ITEM_TYPE.LINE, line.id),
          localMaxTimestampRef.current,
          doc.clientID,
        )
      }, localOriginRef.current)
    },
    [docRef, localMaxTimestampRef, localOriginRef],
  )

  const updateLine = useCallback(
    (id: string, updates: Partial<Omit<Line, 'id'>>) => {
      updateItem(CANVAS_ITEM_TYPE.LINE, id, updates)
    },
    [updateItem],
  )

  const addTextBox = useCallback(
    (textBox: TextBox) => {
      const doc = docRef.current
      if (!doc) return

      const yTextBoxes = doc.getArray<YMap<unknown>>(YJS_TYPE[CANVAS_ITEM_TYPE.TEXT_BOX])
      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)
      const yMap = new YMap()

      Object.entries(textBox).forEach(([key, value]) => {
        yMap.set(key, value)
      })

      doc.transact(() => {
        yTextBoxes.push([yMap])
        localMaxTimestampRef.current = assignNextRank(
          yZRankByKey,
          makeKey(CANVAS_ITEM_TYPE.TEXT_BOX, textBox.id),
          localMaxTimestampRef.current,
          doc.clientID,
        )
      }, localOriginRef.current)
    },
    [docRef, localMaxTimestampRef, localOriginRef],
  )

  const updateTextBox = useCallback(
    (id: string, updates: Partial<Omit<TextBox, 'id'>>) => {
      updateItem(CANVAS_ITEM_TYPE.TEXT_BOX, id, updates)
    },
    [updateItem],
  )

  const deleteCanvasItem = useCallback(
    (canvasItemType: CanvasItemType, id: string) => {
      const doc = docRef.current
      if (!doc) return

      const yArray = doc.getArray<YMap<unknown>>(YJS_TYPE[canvasItemType])
      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)

      const idToIndexMap = new Map<string, number>()
      yArray.forEach((yMap, index) => {
        const itemId = yMap.get('id') as string
        if (itemId) {
          idToIndexMap.set(itemId, index)
        }
      })

      const index = idToIndexMap.get(id)
      if (index === undefined) return

      doc.transact(() => {
        yArray.delete(index, 1)
        yZRankByKey.delete(makeKey(canvasItemType, id))
      }, localOriginRef.current)
    },
    [docRef, localOriginRef],
  )

  const moveToTop = useCallback(
    (canvasItemType: CanvasItemType, id: string) => {
      const doc = docRef.current
      if (!doc) return

      const yZRankByKey = doc.getMap<YjsRank>(YJS_TYPE.Z_RANK_BY_KEY)
      const key = makeKey(canvasItemType, id)
      let changed = false

      doc.transact(() => {
        const current = yZRankByKey.get(key)
        if (!current) return
        if (shouldSkipMoveToTop(yZRankByKey, current, localMaxTimestampRef.current)) {
          return
        }
        localMaxTimestampRef.current = assignNextRank(yZRankByKey, key, localMaxTimestampRef.current, doc.clientID)
        changed = true
      }, localOriginRef.current)
      if (!changed) return

      const undoManager = undoManagerRef.current
      if (!undoManager) return
      undoManager.stopCapturing()
      updateHistoryState()
    },
    [docRef, localMaxTimestampRef, localOriginRef, undoManagerRef, updateHistoryState],
  )

  return {
    addPostIt,
    updatePostIt,
    addPlaceCard,
    updatePlaceCard,
    addLine,
    updateLine,
    addTextBox,
    updateTextBox,
    deleteCanvasItem,
    moveToTop,
  }
}
