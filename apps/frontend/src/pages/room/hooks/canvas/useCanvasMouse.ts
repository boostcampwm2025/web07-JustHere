import { useState, useCallback } from 'react'
import type Konva from 'konva'
import { addSocketBreadcrumb } from '@/shared/utils'
import type { ToolType, PostIt, PlaceCard, TextBox, SelectionBox, SelectedItem, CanvasItemType, BoundingBox, Line as LineType } from '@/shared/types'
import { getLineBoundingBox, isBoxIntersecting } from '@/pages/room/utils'
import {
  DEFAULT_POST_IT_COLOR,
  PLACE_CARD_HEIGHT,
  PLACE_CARD_WIDTH,
  POST_IT_HEIGHT,
  POST_IT_WIDTH,
  TEXT_BOX_WIDTH,
  TEXT_BOX_HEIGHT,
} from '@/pages/room/constants'

interface UseCanvasMouseProps {
  stageRef: React.RefObject<Konva.Stage | null>
  effectiveTool: ToolType
  setActiveTool: (tool: ToolType) => void
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null

  // Selection
  selectedItems: SelectedItem[]
  setSelectedItems: React.Dispatch<React.SetStateAction<SelectedItem[]>>
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>

  // Cursor & Chat
  updateCursor: (x: number, y: number) => void
  isChatActive: boolean
  setChatInputPosition: (pos: { x: number; y: number }) => void

  // Drawing
  getIsDrawing: () => boolean
  cancelDrawing: (reason: 'tool-change' | 'mouse-leave' | 'space-press') => void
  startDrawing: (pos: { x: number; y: number }, lineNode: Konva.Line, layer: Konva.Layer) => void
  continueDrawing: (pos: { x: number; y: number }) => void
  endDrawing: () => void
  currentDrawingLineRef: React.RefObject<Konva.Line | null>

  // Canvas items
  postIts: PostIt[]
  placeCards: PlaceCard[]
  lines: LineType[]
  textBoxes: TextBox[]

  // Add functions
  addPlaceCard: (card: PlaceCard) => void
  addPostIt: (postIt: PostIt) => void
  addTextBox: (textBox: TextBox) => void
  stopCapturing: () => void

  // Z-index
  moveToTop: (type: CanvasItemType, id: string) => void

  // Logging
  roomId: string
  canvasId: string

  // Callbacks
  onPlaceCardPlaced: () => void

  // User info
  userName: string
}

export const useCanvasMouse = ({
  stageRef,
  effectiveTool,
  setActiveTool,
  pendingPlaceCard,
  selectedItems,
  setSelectedItems,
  setContextMenu,
  updateCursor,
  isChatActive,
  setChatInputPosition,
  getIsDrawing,
  cancelDrawing,
  startDrawing,
  continueDrawing,
  endDrawing,
  currentDrawingLineRef,
  postIts,
  placeCards,
  lines,
  textBoxes,
  addPlaceCard,
  addPostIt,
  addTextBox,
  stopCapturing,
  moveToTop,
  roomId,
  canvasId,
  onPlaceCardPlaced,
  userName,
}: UseCanvasMouseProps) => {
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [placeCardCursorPos, setPlaceCardCursorPos] = useState<{ x: number; y: number; cardId: string } | null>(null)

  const handleObjectMouseDown = useCallback(
    (id: string, type: CanvasItemType, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (pendingPlaceCard) return
      if (effectiveTool !== 'cursor') return

      e.cancelBubble = true

      moveToTop(type, id)

      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      const isAlreadySelected = selectedItems.some(item => item.id === id && item.type === type)

      if (!metaPressed && !isAlreadySelected) {
        setSelectedItems([{ id, type }])
      } else if (metaPressed && isAlreadySelected) {
        setSelectedItems(prev => prev.filter(item => !(item.id === id && item.type === type)))
      } else if (metaPressed && !isAlreadySelected) {
        setSelectedItems(prev => [...prev, { id, type }])
      }
    },
    [effectiveTool, pendingPlaceCard, selectedItems, setSelectedItems, moveToTop],
  )

  const handleObjectClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (pendingPlaceCard) return
      if (effectiveTool !== 'cursor') return

      e.cancelBubble = true

      if (e.evt.button === 2) {
        e.evt.preventDefault()
        const stage = stageRef.current
        if (stage) {
          const pointerPos = stage.getRelativePointerPosition()
          if (pointerPos) {
            setContextMenu({ x: e.evt.clientX, y: e.evt.clientY })
          }
        }
      } else {
        setContextMenu(null)
      }
    },
    [effectiveTool, pendingPlaceCard, setContextMenu, stageRef],
  )

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedItems([])
        setContextMenu(null)
      }
    },
    [setSelectedItems, setContextMenu],
  )

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const canvasPos = stage.getRelativePointerPosition()
    if (canvasPos) {
      updateCursor(canvasPos.x, canvasPos.y)

      if ((effectiveTool === 'postIt' || effectiveTool === 'textBox') && !pendingPlaceCard) {
        setCursorPos(canvasPos)
      }

      if (pendingPlaceCard) {
        setPlaceCardCursorPos({ ...canvasPos, cardId: pendingPlaceCard.id })
      }

      if (effectiveTool === 'cursor' && isSelecting) {
        setSelectionBox(prev => {
          if (!prev) return null
          return {
            ...prev,
            endX: canvasPos.x,
            endY: canvasPos.y,
          }
        })
      }

      if (effectiveTool === 'pencil' && getIsDrawing()) {
        continueDrawing(canvasPos)
      }

      if (isChatActive) {
        const pointerPos = stage.getPointerPosition()
        if (pointerPos) {
          setChatInputPosition({ x: pointerPos.x + 20, y: pointerPos.y - 30 })
        }
      }
    }
  }, [stageRef, updateCursor, effectiveTool, pendingPlaceCard, isSelecting, getIsDrawing, continueDrawing, isChatActive, setChatInputPosition])

  const handleMouseLeave = useCallback(() => {
    if (effectiveTool === 'postIt') {
      setCursorPos(null)
    }
    if (pendingPlaceCard) {
      setPlaceCardCursorPos(null)
    }
    if (getIsDrawing()) {
      cancelDrawing('mouse-leave')
    }
  }, [effectiveTool, pendingPlaceCard, getIsDrawing, cancelDrawing])

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const isMouseEvent = e.evt.type.startsWith('mouse')
      if (isMouseEvent) {
        const mouseEvt = e.evt as MouseEvent
        if (mouseEvt.button === 2) return
      }

      const stage = stageRef.current
      if (!stage) return

      const canvasPos = stage.getRelativePointerPosition()
      if (!canvasPos) return

      if (pendingPlaceCard) {
        addPlaceCard({
          ...pendingPlaceCard,
          x: canvasPos.x - PLACE_CARD_WIDTH / 2,
          y: canvasPos.y - PLACE_CARD_HEIGHT / 2,
        })
        addSocketBreadcrumb('placecard:add', { roomId, canvasId, id: pendingPlaceCard.id })
        onPlaceCardPlaced()
        return
      }

      if (effectiveTool === 'cursor') {
        if (e.target === e.target.getStage()) {
          setIsSelecting(true)
          setSelectionBox({
            startX: canvasPos.x,
            startY: canvasPos.y,
            endX: canvasPos.x,
            endY: canvasPos.y,
          })
          setSelectedItems([])
        }
        return
      }

      if (effectiveTool === 'hand') return

      if (effectiveTool === 'postIt') {
        stopCapturing()
        const newPostIt: PostIt = {
          id: `postIt-${crypto.randomUUID()}`,
          x: canvasPos.x - POST_IT_WIDTH / 2,
          y: canvasPos.y - POST_IT_HEIGHT / 2,
          width: POST_IT_WIDTH,
          height: POST_IT_HEIGHT,
          scale: 1,
          fill: DEFAULT_POST_IT_COLOR,
          text: '',
          authorName: userName,
        }
        addPostIt(newPostIt)
        addSocketBreadcrumb('postit:add', { roomId, canvasId, id: newPostIt.id })
        setActiveTool('cursor')
        setCursorPos(null) // ghost 이미지 제거
      }

      if (effectiveTool === 'pencil') {
        const layer = stage.getLayers()[0]
        const lineNode = currentDrawingLineRef.current

        if (layer && lineNode) {
          startDrawing(canvasPos, lineNode, layer)
        }
      }

      if (effectiveTool === 'textBox') {
        stopCapturing()
        const newTextBox: TextBox = {
          id: `textBox-${crypto.randomUUID()}`,
          x: canvasPos.x - TEXT_BOX_WIDTH / 2,
          y: canvasPos.y - TEXT_BOX_HEIGHT / 2,
          width: TEXT_BOX_WIDTH,
          height: TEXT_BOX_HEIGHT,
          scale: 1,
          text: '',
          authorName: userName,
        }
        addTextBox(newTextBox)
        setActiveTool('cursor')
        setCursorPos(null) // ghost 이미지 제거
      }
    },
    [
      stageRef,
      pendingPlaceCard,
      addPlaceCard,
      roomId,
      canvasId,
      onPlaceCardPlaced,
      effectiveTool,
      setSelectedItems,
      stopCapturing,
      userName,
      addPostIt,
      startDrawing,
      currentDrawingLineRef,
      addTextBox,
      setActiveTool,
    ],
  )

  const handleMouseUp = useCallback(() => {
    if (effectiveTool === 'pencil' && getIsDrawing()) {
      endDrawing()
    }

    if (effectiveTool === 'cursor' && isSelecting) {
      setSelectionBox(currentSelectionBox => {
        if (!currentSelectionBox) return null

        const newSelectedItems: SelectedItem[] = []

        postIts.forEach(postIt => {
          const postItBox: BoundingBox = {
            x: postIt.x,
            y: postIt.y,
            width: postIt.width,
            height: postIt.height,
          }
          if (isBoxIntersecting(currentSelectionBox, postItBox)) {
            newSelectedItems.push({ id: postIt.id, type: 'postit' })
          }
        })

        placeCards.forEach(card => {
          const cardBox: BoundingBox = {
            x: card.x,
            y: card.y,
            width: PLACE_CARD_WIDTH,
            height: PLACE_CARD_HEIGHT,
          }
          if (isBoxIntersecting(currentSelectionBox, cardBox)) {
            newSelectedItems.push({ id: card.id, type: 'placeCard' })
          }
        })

        lines.forEach(line => {
          const lineBox = getLineBoundingBox(line.points)
          if (isBoxIntersecting(currentSelectionBox, lineBox)) {
            newSelectedItems.push({ id: line.id, type: 'line' })
          }
        })

        textBoxes.forEach(tb => {
          const bound = { x: tb.x, y: tb.y, width: tb.width, height: tb.height }
          if (isBoxIntersecting(currentSelectionBox, bound)) {
            newSelectedItems.push({ id: tb.id, type: 'textBox' })
          }
        })

        setSelectedItems(newSelectedItems)
        return null
      })
      setIsSelecting(false)
    }
  }, [effectiveTool, getIsDrawing, endDrawing, isSelecting, postIts, placeCards, lines, textBoxes, setSelectedItems])

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = stageRef.current
      if (!stage) return

      if (!e.evt.metaKey && !e.evt.ctrlKey) {
        const nextX = stage.x() - e.evt.deltaX
        const nextY = stage.y() - e.evt.deltaY

        stage.position({ x: nextX, y: nextY })
        stage.batchDraw()
        return
      }

      const scaleBy = 1.05
      const oldScale = stage.scaleX()
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }

      stage.scale({ x: newScale, y: newScale })
      stage.position(newPos)
      stage.batchDraw()
    },
    [stageRef],
  )

  return {
    // State
    selectionBox,
    isSelecting,
    cursorPos,
    setCursorPos,
    placeCardCursorPos,

    // Handlers
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleWheel,
    handleStageClick,
    handleObjectMouseDown,
    handleObjectClick,
  }
}
