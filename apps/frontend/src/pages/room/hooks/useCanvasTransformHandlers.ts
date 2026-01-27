import type { DragInitialState, Line, PlaceCard, PostIt, TextBox } from '@/shared/types'
import type Konva from 'konva'
import { useCallback, useRef } from 'react'

interface TransformableItem {
  id: string
  width: number
  height: number
  scale: number
}

/**
 * Konva Transform 이벤트 후 아이템의 크기와 스케일을 업데이트하는 공통 함수
 *
 * Konva는 Transform 시 노드의 scaleX/scaleY를 변경하는데,
 * 이를 1로 리셋하고 실제 width/height/scale 값으로 변환하도록 하는 함수 (공식문서 피셜 이래야 안정적임)
 */
const applyTransform = (
  item: TransformableItem,
  e: Konva.KonvaEventObject<Event>,
  updateFn: (id: string, payload: { x: number; y: number; width: number; height: number; scale: number }) => void,
) => {
  const node = e.target as Konva.Group
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  node.scaleX(1)
  node.scaleY(1)

  const newWidth = item.width * scaleX
  const newHeight = item.height * scaleY
  const minScale = Math.min(scaleX, scaleY)
  const newScale = item.scale * minScale

  updateFn(item.id, {
    x: node.x(),
    y: node.y(),
    width: newWidth,
    height: newHeight,
    scale: newScale,
  })
}

export const useCanvasTransformHandlers = ({
  transformerRef,
  selectedItems,
  postIts,
  placeCards,
  textBoxes,
  lines,
  updatePostIt,
  updatePlaceCard,
  updateTextBox,
  updateLine,
}: {
  transformerRef: React.RefObject<Konva.Transformer | null>
  selectedItems: { id: string; type: string }[]
  postIts: PostIt[]
  placeCards: PlaceCard[]
  textBoxes: TextBox[]
  lines: Line[]
  updatePostIt: (id: string, payload: Partial<PostIt>) => void
  updatePlaceCard: (id: string, payload: Partial<PlaceCard>) => void
  updateTextBox: (id: string, payload: Partial<TextBox>) => void
  updateLine: (id: string, payload: Partial<Line>) => void
}) => {
  const transformerDragStartPos = useRef<{ x: number; y: number } | null>(null)
  const itemStatesBeforeDrag = useRef<Map<string, DragInitialState>>(new Map())

  const handlePostItTransformEnd = useCallback(
    (postIt: PostIt, e: Konva.KonvaEventObject<Event>) => applyTransform(postIt, e, updatePostIt),
    [updatePostIt],
  )

  const handleTextBoxTransformEnd = useCallback(
    (textBox: TextBox, e: Konva.KonvaEventObject<Event>) => applyTransform(textBox, e, updateTextBox),
    [updateTextBox],
  )

  const handlePlaceCardTransformEnd = useCallback(
    (card: PlaceCard, e: Konva.KonvaEventObject<Event>) => {
      applyTransform(card, e, updatePlaceCard)
    },
    [updatePlaceCard],
  )

  const handleTransformerDragStart = useCallback(() => {
    const nodes = transformerRef.current?.nodes() || []
    if (nodes.length > 0) {
      transformerDragStartPos.current = { x: nodes[0].x(), y: nodes[0].y() }
    }
    itemStatesBeforeDrag.current.clear()

    selectedItems.forEach(({ id, type }) => {
      if (type === 'postit') {
        const item = postIts.find(p => p.id === id)
        if (item) itemStatesBeforeDrag.current.set(id, { type, x: item.x, y: item.y })
      } else if (type === 'placeCard') {
        const item = placeCards.find(c => c.id === id)
        if (item) itemStatesBeforeDrag.current.set(id, { type, x: item.x, y: item.y })
      } else if (type === 'textBox') {
        const item = textBoxes.find(t => t.id === id)
        if (item) itemStatesBeforeDrag.current.set(id, { type, x: item.x, y: item.y })
      } else if (type === 'line') {
        const item = lines.find(l => l.id === id)
        if (item) itemStatesBeforeDrag.current.set(id, { type, points: [...item.points] })
      }
    })
  }, [selectedItems, postIts, placeCards, textBoxes, lines, transformerRef])

  const handleTransformerDragEnd = useCallback(() => {
    if (!transformerDragStartPos.current || itemStatesBeforeDrag.current.size === 0) return

    const nodes = transformerRef.current?.nodes() || []
    if (nodes.length === 0) return

    const endPos = { x: nodes[0].x(), y: nodes[0].y() }
    const dx = endPos.x - transformerDragStartPos.current.x
    const dy = endPos.y - transformerDragStartPos.current.y

    itemStatesBeforeDrag.current.forEach((originalState, id) => {
      const isSelected = selectedItems.some(i => i.id === id)
      if (!isSelected) return

      if (originalState.type === 'postit' || originalState.type === 'placeCard' || originalState.type === 'textBox') {
        const updater = originalState.type === 'postit' ? updatePostIt : originalState.type === 'placeCard' ? updatePlaceCard : updateTextBox
        updater(id, { x: originalState.x + dx, y: originalState.y + dy })
      } else if (originalState.type === 'line') {
        const newPoints = originalState.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy))
        updateLine(id, { points: newPoints })
      }
    })

    transformerDragStartPos.current = null
    itemStatesBeforeDrag.current.clear()
  }, [transformerRef, selectedItems, updatePostIt, updatePlaceCard, updateTextBox, updateLine])

  return {
    handlePostItTransformEnd,
    handlePlaceCardTransformEnd,
    handleTextBoxTransformEnd,
    handleTransformerDragStart,
    handleTransformerDragEnd,
  }
}
