import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/shared/utils'
import { useYjsSocket } from '@/pages/room/hooks'
import type { PostIt, Line as LineType, PlaceCard, SelectedItem, CanvasItemType, ToolType, SelectionBox, BoundingBox } from '@/shared/types'
import { AnimatedCursor } from './AnimatedCursor'
import { CanvasContextMenu } from './CanvasContextMenu'
import { CursorChatInput } from './CursorChatInput'
import { EditablePostIt } from './EditablePostIt'
import { PlaceCardItem } from './PlaceCardItem'
import { Toolbar } from './toolbar'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceCardPlaced: () => void
  onPlaceCardCanceled: () => void
}

const PLACE_CARD_WIDTH = 240
const PLACE_CARD_HEIGHT = 180

const MIN_POSTIT_SIZE = 50
const MIN_PLACE_CARD_WIDTH = 100
const MIN_PLACE_CARD_HEIGHT = 75

const getLineBoundingBox = (points: number[]): BoundingBox => {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = points.filter((_, i) => i % 2 === 0)
  const ys = points.filter((_, i) => i % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const isBoxIntersecting = (selectionBox: SelectionBox, boundingBox: BoundingBox): boolean => {
  const selMinX = Math.min(selectionBox.startX, selectionBox.endX)
  const selMaxX = Math.max(selectionBox.startX, selectionBox.endX)
  const selMinY = Math.min(selectionBox.startY, selectionBox.endY)
  const selMaxY = Math.max(selectionBox.startY, selectionBox.endY)

  const boxMinX = boundingBox.x
  const boxMaxX = boundingBox.x + boundingBox.width
  const boxMinY = boundingBox.y
  const boxMaxY = boundingBox.y + boundingBox.height

  return selMinX <= boxMaxX && selMaxX >= boxMinX && selMinY <= boxMaxY && selMaxY >= boxMinY
}

type DragInitialState = { type: 'postit' | 'placeCard'; x: number; y: number } | { type: 'line'; points: number[] }

export const WhiteboardCanvas = ({ roomId, canvasId, pendingPlaceCard, onPlaceCardPlaced, onPlaceCardCanceled }: WhiteboardCanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef(new Map<string, Konva.Group>())

  const transformerDragStartPos = useRef<{ x: number; y: number } | null>(null)
  const itemStatesBeforeDrag = useRef<Map<string, DragInitialState>>(new Map())

  const [activeTool, setActiveTool] = useState<ToolType>('cursor')

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLineId, setCurrentLineId] = useState<string | null>(null)

  const [isSpacePressed, setIsSpacePressed] = useState(false)

  const effectiveTool = useMemo(() => (isSpacePressed ? 'hand' : activeTool), [isSpacePressed, activeTool])

  const [placeCardCursorPos, setPlaceCardCursorPos] = useState<{ x: number; y: number; cardId: string } | null>(null)

  useEffect(() => {
    if (!pendingPlaceCard) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onPlaceCardCanceled()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingPlaceCard, onPlaceCardCanceled])

  const [isChatActive, setIsChatActive] = useState(false)
  const [isChatFading, setIsChatFading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatInputPosition, setChatInputPosition] = useState<{ x: number; y: number } | null>(null)
  const chatInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const userName = user ? user.name : 'Unknown User'

  const {
    cursors,
    postits: postIts,
    placeCards,
    lines,
    socketId,
    canUndo,
    canRedo,
    updateCursor,
    sendCursorChat,
    undo,
    redo,
    stopCapturing,
    addPostIt,
    updatePostIt,
    deletePostIt,
    updatePlaceCard,
    removePlaceCard,
    addPlaceCard,
    addLine,
    updateLine,
    deleteLine,
  } = useYjsSocket({
    roomId,
    canvasId,
    userName,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === 'Backspace' && selectedItems.length > 0) {
        selectedItems.forEach(item => {
          if (item.type === 'postit') deletePostIt(item.id)
          if (item.type === 'line') deleteLine(item.id)
          if (item.type === 'placeCard') removePlaceCard(item.id)
        })

        setSelectedItems([])
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItems, deletePostIt, deleteLine, removePlaceCard])

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    const nodes = selectedItems.map(item => shapeRefs.current.get(item.id)).filter((node): node is Konva.Group => !!node)
    transformer.nodes(nodes)
  }, [selectedItems])

  const handlePostItTransformEnd = useCallback(
    (postIt: PostIt, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Group
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      node.scaleX(1)
      node.scaleY(1)

      const newWidth = Math.max(MIN_POSTIT_SIZE, postIt.width * scaleX)
      const newHeight = Math.max(MIN_POSTIT_SIZE, postIt.height * scaleY)

      const minScale = Math.min(scaleX, scaleY)
      const newScale = postIt.scale * minScale

      updatePostIt(postIt.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        scale: newScale,
      })
    },
    [updatePostIt],
  )

  const handlePlaceCardTransformEnd = useCallback(
    (card: PlaceCard, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Group
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      node.scaleX(1)
      node.scaleY(1)

      const cardWidth = card.width ?? PLACE_CARD_WIDTH
      const cardHeight = card.height ?? PLACE_CARD_HEIGHT

      const newWidth = Math.max(MIN_PLACE_CARD_WIDTH, cardWidth * scaleX)
      const newHeight = Math.max(MIN_PLACE_CARD_HEIGHT, cardHeight * scaleY)

      const minScale = Math.min(scaleX, scaleY)
      const newScale = card.scale * minScale

      updatePlaceCard(card.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        scale: newScale,
      })
    },
    [updatePlaceCard],
  )

  const handleTransformerDragStart = useCallback(() => {
    const nodes = transformerRef.current?.nodes() || []
    if (nodes.length > 0) {
      transformerDragStartPos.current = { x: nodes[0].x(), y: nodes[0].y() }
    }

    itemStatesBeforeDrag.current.clear()
    selectedItems.forEach(item => {
      if (item.type === 'postit') {
        const postit = postIts.find(p => p.id === item.id)
        if (postit) itemStatesBeforeDrag.current.set(item.id, { type: 'postit', x: postit.x, y: postit.y })
      } else if (item.type === 'placeCard') {
        const card = placeCards.find(c => c.id === item.id)
        if (card) itemStatesBeforeDrag.current.set(item.id, { type: 'placeCard', x: card.x, y: card.y })
      } else if (item.type === 'line') {
        const line = lines.find(l => l.id === item.id)
        if (line) itemStatesBeforeDrag.current.set(item.id, { type: 'line', points: [...line.points] })
      }
    })
  }, [selectedItems, postIts, placeCards, lines])

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

      if (originalState.type === 'postit' || originalState.type === 'placeCard') {
        const updater = originalState.type === 'postit' ? updatePostIt : updatePlaceCard
        updater(id, { x: originalState.x + dx, y: originalState.y + dy })
      } else if (originalState.type === 'line') {
        const newPoints = originalState.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy))
        updateLine(id, { points: newPoints })
      }
    })

    transformerDragStartPos.current = null
    itemStatesBeforeDrag.current.clear()
  }, [selectedItems, updateLine, updatePostIt, updatePlaceCard])

  const handleObjectMouseDown = useCallback(
    (id: string, type: CanvasItemType, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (pendingPlaceCard) return
      if (effectiveTool !== 'cursor') return

      e.cancelBubble = true

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
    [effectiveTool, pendingPlaceCard, selectedItems],
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
    [effectiveTool, pendingPlaceCard],
  )

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedItems([])
      setContextMenu(null)
    }
  }

  const handleDeleteFromMenu = () => {
    selectedItems.forEach(item => {
      if (item.type === 'postit') deletePostIt(item.id)
      if (item.type === 'line') deleteLine(item.id)
      if (item.type === 'placeCard') removePlaceCard(item.id)
    })
    setSelectedItems([])
    setContextMenu(null)
  }

  const deactivateCursorChat = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
      chatInactivityTimerRef.current = null
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)
    setIsChatActive(false)
    setChatMessage('')
    setChatInputPosition(null)
    sendCursorChat(false, '')
  }, [sendCursorChat])

  const startFadeOut = useCallback(() => {
    setIsChatFading(true)
    chatFadeTimerRef.current = setTimeout(() => {
      deactivateCursorChat()
    }, 3000)
  }, [deactivateCursorChat])

  const resetInactivityTimer = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)

    chatInactivityTimerRef.current = setTimeout(() => {
      startFadeOut()
    }, 3000)
  }, [startFadeOut])

  const activateCursorChat = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const pointerPos = stage.getPointerPosition()
    if (pointerPos) {
      setChatInputPosition({ x: pointerPos.x + 20, y: pointerPos.y - 30 })
    }

    setIsChatActive(true)
    setChatMessage('')
    sendCursorChat(true, '')

    resetInactivityTimer()
  }, [sendCursorChat, resetInactivityTimer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isChatActive) return

      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        activateCursorChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChatActive, activateCursorChat])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleMouseMove = () => {
    const stage = stageRef.current
    if (!stage) return

    const canvasPos = stage.getRelativePointerPosition()
    if (canvasPos) {
      updateCursor(canvasPos.x, canvasPos.y)

      if (effectiveTool === 'postIt' && !pendingPlaceCard) {
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

      if (effectiveTool === 'pencil' && isDrawing && currentLineId) {
        const currentLine = lines.find(line => line.id === currentLineId)
        if (currentLine) {
          const newPoints = [...currentLine.points, canvasPos.x, canvasPos.y]
          updateLine(currentLineId, { points: newPoints })
        }
      }

      if (isChatActive) {
        const pointerPos = stage.getPointerPosition()
        if (pointerPos) {
          setChatInputPosition({ x: pointerPos.x + 20, y: pointerPos.y - 30 })
        }
      }
    }
  }

  const handleMouseLeave = () => {
    if (effectiveTool === 'postIt') {
      setCursorPos(null)
    }
    if (pendingPlaceCard) {
      setPlaceCardCursorPos(null)
    }
    if (isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
    }
  }

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
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
        x: canvasPos.x - 75,
        y: canvasPos.y - 75,
        width: 150,
        height: 150,
        scale: 1,
        fill: '#FFF9C4',
        text: '내용을 입력하세요',
        authorName: `User ${socketId.substring(0, 4)}`,
      }
      addPostIt(newPostIt)
    }

    if (effectiveTool === 'pencil') {
      stopCapturing()
      setIsDrawing(true)
      const newLineId = `line-${crypto.randomUUID()}`
      setCurrentLineId(newLineId)

      const newLine: LineType = {
        id: newLineId,
        points: [canvasPos.x, canvasPos.y],
        stroke: '#000000',
        strokeWidth: 2,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        tool: 'pen',
      }
      addLine(newLine)
    }
  }

  const handleMouseUp = () => {
    if (effectiveTool === 'pencil' && isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
      stopCapturing()
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

        setSelectedItems(newSelectedItems)
        return null
      })
      setIsSelecting(false)
    }
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    if (!e.evt.metaKey && !e.evt.ctrlKey) {
      return
    }

    const stage = stageRef.current
    if (!stage) return

    const scaleBy = 1.05
    const oldScale = stage.scaleX()
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    stage.scale({ x: clampedScale, y: clampedScale })
    stage.position(newPos)
  }

  const getCursorStyle = () => {
    if (pendingPlaceCard) {
      return 'cursor-crosshair'
    }
    switch (effectiveTool) {
      case 'cursor':
        return 'cursor-default'
      case 'hand':
        return 'cursor-grab active:cursor-grabbing'
      case 'pencil':
        return 'cursor-crosshair'
      case 'postIt':
        return 'cursor-pointer'
      default:
        return 'cursor-default'
    }
  }

  return (
    <div className={`relative w-full h-full bg-gray-50 ${getCursorStyle()}`} onContextMenu={e => e.preventDefault()}>
      <Toolbar
        effectiveTool={effectiveTool}
        setActiveTool={setActiveTool}
        setCursorPos={setCursorPos}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {contextMenu && <CanvasContextMenu position={contextMenu} onDelete={handleDeleteFromMenu} onClose={() => setContextMenu(null)} />}

      {isChatActive && chatInputPosition && (
        <CursorChatInput
          position={chatInputPosition}
          name={userName}
          isFading={isChatFading}
          message={chatMessage}
          onMessageChange={value => {
            setChatMessage(value)
            sendCursorChat(true, value)
            resetInactivityTimer()
          }}
          onEscape={deactivateCursorChat}
        />
      )}

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={!pendingPlaceCard && effectiveTool === 'hand'}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onContextMenu={e => e.evt.preventDefault()}
      >
        <Layer>
          {lines.map(line => {
            const canDrag = effectiveTool === 'cursor' && !pendingPlaceCard
            const box = getLineBoundingBox(line.points)

            return (
              <Group
                key={line.id}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                draggable={canDrag}
                ref={node => {
                  if (node) {
                    shapeRefs.current.set(line.id, node)
                  } else {
                    shapeRefs.current.delete(line.id)
                  }
                }}
                onMouseDown={e => handleObjectMouseDown(line.id, 'line', e)}
                onClick={e => handleObjectClick(e)}
                onContextMenu={e => handleObjectClick(e)}
                onDragEnd={e => {
                  const node = e.target
                  const dx = node.x() - box.x
                  const dy = node.y() - box.y
                  const newPoints = line.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy))
                  updateLine(line.id, { points: newPoints })
                }}
                onTransformEnd={e => {
                  const node = e.target as Konva.Group
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()

                  node.scaleX(1)
                  node.scaleY(1)

                  const relativePoints = line.points.map((p, i) => (i % 2 === 0 ? p - box.x : p - box.y))

                  const newAbsolutePoints: number[] = []
                  for (let i = 0; i < relativePoints.length; i += 2) {
                    newAbsolutePoints.push(node.x() + relativePoints[i] * scaleX)
                    newAbsolutePoints.push(node.y() + relativePoints[i + 1] * scaleY)
                  }
                  updateLine(line.id, { points: newAbsolutePoints })
                }}
              >
                <Rect width={box.width} height={box.height} fill="transparent" />
                <Line
                  points={line.points.map((p, i) => (i % 2 === 0 ? p - box.x : p - box.y))}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={line.tension}
                  lineCap={line.lineCap}
                  lineJoin={line.lineJoin}
                  globalCompositeOperation={line.tool === 'pen' ? 'source-over' : 'destination-out'}
                  listening={false}
                  width={box.width}
                  height={box.height}
                />
              </Group>
            )
          })}

          {postIts.map(postIt => {
            const canDrag = effectiveTool === 'cursor' && !pendingPlaceCard

            return (
              <EditablePostIt
                key={postIt.id}
                postIt={postIt}
                draggable={canDrag}
                onEditStart={stopCapturing}
                onEditEnd={stopCapturing}
                onDragEnd={(x, y) => {
                  updatePostIt(postIt.id, { x, y })
                }}
                onChange={updates => {
                  updatePostIt(postIt.id, updates)
                }}
                onMouseDown={e => handleObjectMouseDown(postIt.id, 'postit', e)}
                onSelect={e => handleObjectClick(e)}
                shapeRef={node => {
                  if (node) {
                    shapeRefs.current.set(postIt.id, node)
                  } else {
                    shapeRefs.current.delete(postIt.id)
                  }
                }}
                onTransformEnd={e => handlePostItTransformEnd(postIt, e)}
              />
            )
          })}

          {placeCards.map(card => {
            const canDrag = effectiveTool === 'cursor' && !pendingPlaceCard

            return (
              <PlaceCardItem
                key={card.id}
                card={card}
                draggable={canDrag}
                onDragEnd={(x, y) => {
                  updatePlaceCard(card.id, { x, y })
                }}
                onRemove={() => {
                  removePlaceCard(card.id)
                }}
                onMouseDown={e => handleObjectMouseDown(card.id, 'placeCard', e)}
                onClick={e => handleObjectClick(e)}
                onContextMenu={e => handleObjectClick(e)}
                shapeRef={node => {
                  if (node) {
                    shapeRefs.current.set(card.id, node)
                  } else {
                    shapeRefs.current.delete(card.id)
                  }
                }}
                onTransformEnd={e => handlePlaceCardTransformEnd(card, e)}
              />
            )
          })}

          {effectiveTool === 'postIt' && !pendingPlaceCard && cursorPos && (
            <Group x={cursorPos.x - 75} y={cursorPos.y - 75} listening={false}>
              <Rect width={150} height={150} fill="#FFF9C4" opacity={0.6} cornerRadius={8} stroke="#9CA3AF" strokeWidth={2} dash={[5, 5]} />
              <Text x={0} y={65} width={150} text="Click to add" align="center" fill="#6B7280" fontSize={14} />
            </Group>
          )}

          {pendingPlaceCard && placeCardCursorPos && placeCardCursorPos.cardId === pendingPlaceCard.id && (
            <Group x={placeCardCursorPos.x - PLACE_CARD_WIDTH / 2} y={placeCardCursorPos.y - PLACE_CARD_HEIGHT / 2} listening={false}>
              <Rect
                width={PLACE_CARD_WIDTH}
                height={PLACE_CARD_HEIGHT}
                fill="#FFFBE6"
                opacity={0.6}
                cornerRadius={10}
                stroke="#9CA3AF"
                strokeWidth={2}
                dash={[6, 6]}
              />
              <Text
                text={pendingPlaceCard.name}
                x={12}
                y={12}
                width={PLACE_CARD_WIDTH - 24}
                fontSize={14}
                fontFamily="Arial, sans-serif"
                fontStyle="bold"
                fill="#6B7280"
                wrap="word"
              />
              <Text
                text={pendingPlaceCard.address}
                x={12}
                y={36}
                width={PLACE_CARD_WIDTH - 24}
                fontSize={12}
                fontFamily="Arial, sans-serif"
                fill="#9CA3AF"
                wrap="word"
              />
            </Group>
          )}

          {isSelecting && selectionBox && (
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < MIN_PLACE_CARD_WIDTH || newBox.height < MIN_PLACE_CARD_HEIGHT) {
                return oldBox
              }
              return newBox
            }}
            rotateEnabled={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            onDragStart={handleTransformerDragStart}
            onDragEnd={handleTransformerDragEnd}
          />

          {Array.from(cursors.values()).map(cursor => (
            <AnimatedCursor key={cursor.socketId} cursor={cursor} />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
