import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useParams } from 'react-router-dom'
import { addSocketBreadcrumb, getOrCreateStoredUser } from '@/shared/utils'
import { useYjsSocket } from '@/pages/room/hooks'
import type { PostIt, PlaceCard, SelectedItem, CanvasItemType, ToolType, SelectionBox, BoundingBox, TextBox } from '@/shared/types'
import { AnimatedCursor } from './animated-cursor'
import { CanvasContextMenu } from './canvas-context-menu'
import { CursorChatInput } from './cursor-chat-input'
import { EditablePostIt } from './editable-postit'
import { PlaceCardItem } from './place-card'
import { EditableTextBox } from './editable-textbox'
import { Toolbar } from './toolbar'
import { getLineBoundingBox, isBoxIntersecting } from '@/pages/room/utils'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { useCanvasTransformHandlers } from '@/pages/room/hooks/useCanvasTransformHandlers'
import { useCursorChat } from '@/pages/room/hooks/useCursorChat'
import { useCanvasKeyboard } from '@/pages/room/hooks/useCanvasKeyboard'
import { useCanvasDraw } from '@/pages/room/hooks/useCanvasDraw'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceCardPlaced: () => void
  onPlaceCardCanceled: () => void
}

export const WhiteboardCanvas = ({ roomId, canvasId, pendingPlaceCard, onPlaceCardPlaced, onPlaceCardCanceled }: WhiteboardCanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef(new Map<string, Konva.Group>())

  const [activeTool, setActiveTool] = useState<ToolType>('cursor')

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const [placeCardCursorPos, setPlaceCardCursorPos] = useState<{ x: number; y: number; cardId: string } | null>(null)

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
    updatePlaceCard,
    addPlaceCard,
    addLine,
    updateLine,
    textBoxes,
    addTextBox,
    updateTextBox,
    deleteCanvasItem,
  } = useYjsSocket({
    roomId,
    canvasId,
    userName,
  })

  const { handlePostItTransformEnd, handlePlaceCardTransformEnd, handleTextBoxTransformEnd, handleTransformerDragStart, handleTransformerDragEnd } =
    useCanvasTransformHandlers({
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
    })

  const {
    isChatActive,
    isChatFading,
    chatMessage,
    chatInputPosition,
    setChatInputPosition,
    activateCursorChat,
    deactivateCursorChat,
    setChatMessage,
    resetInactivityTimer,
  } = useCursorChat({ stageRef, sendCursorChat })

  const { isDrawing, cancelDrawing, startDrawing, continueDrawing, endDrawing } = useCanvasDraw({
    lines,
    addLine,
    updateLine,
    stopCapturing,
    roomId,
    canvasId,
  })

  const handleToolChange = useCallback(
    (tool: ToolType) => {
      if (tool !== 'pencil' && isDrawing) {
        cancelDrawing('tool-change')
      }
      setActiveTool(tool)
    },
    [isDrawing, cancelDrawing],
  )

  const handleDeleteSelectedItems = useCallback(() => {
    selectedItems.forEach(item => {
      deleteCanvasItem(item.type, item.id)
    })

    // sentry를 위한 로그 남기기
    const lineCount = selectedItems.filter(item => item.type === 'line').length
    const postItCount = selectedItems.filter(item => item.type === 'postit').length
    const placeCardCount = selectedItems.filter(item => item.type === 'placeCard').length
    const textBoxCount = selectedItems.filter(item => item.type === 'textBox').length
    if (lineCount > 0) {
      addSocketBreadcrumb('line:delete', { roomId, canvasId, count: lineCount })
    }
    if (postItCount > 0) {
      addSocketBreadcrumb('postit:delete', { roomId, canvasId, count: postItCount })
    }
    if (placeCardCount > 0) {
      addSocketBreadcrumb('placecard:delete', { roomId, canvasId, count: placeCardCount })
    }
    if (textBoxCount > 0) {
      addSocketBreadcrumb('textbox:delete', { roomId, canvasId, count: textBoxCount })
    }

    setSelectedItems([])
    setContextMenu(null)
  }, [canvasId, deleteCanvasItem, roomId, selectedItems])

  const hasSelectedItems = selectedItems.length > 0
  const { isSpacePressed } = useCanvasKeyboard({
    onPlaceCardCanceled,
    hasSelectedItems,
    handleDeleteSelectedItems,
    isChatActive,
    activateCursorChat,
    isDrawing,
    cancelDrawing,
  })
  const effectiveTool = useMemo(() => (isSpacePressed ? 'hand' : activeTool), [isSpacePressed, activeTool])

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    const nodes = selectedItems.map(item => shapeRefs.current.get(item.id)).filter((node): node is Konva.Group => !!node)
    transformer.nodes(nodes)
  }, [selectedItems])

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

  const handleMouseMove = () => {
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

      if (effectiveTool === 'pencil') {
        continueDrawing(canvasPos)
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
      cancelDrawing('mouse-leave')
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
        x: canvasPos.x - 75,
        y: canvasPos.y - 75,
        width: 150,
        height: 150,
        scale: 1,
        fill: '#FFF9C4',
        text: '',
        authorName: userName,
      }
      addPostIt(newPostIt)
      addSocketBreadcrumb('postit:add', { roomId, canvasId, id: newPostIt.id })
    }

    if (effectiveTool === 'pencil') {
      startDrawing(canvasPos)
    }

    if (effectiveTool === 'textBox') {
      stopCapturing()
      const newTextBox: TextBox = {
        id: `textBox-${crypto.randomUUID()}`,
        x: canvasPos.x - 100,
        y: canvasPos.y - 25,
        width: 200,
        height: 50,
        scale: 1,
        text: '',
        authorName: `User ${socketId.substring(0, 4)}`,
      }
      addTextBox(newTextBox)
    }
  }

  const handleMouseUp = () => {
    if (effectiveTool === 'pencil') {
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
        setActiveTool={handleToolChange}
        setCursorPos={setCursorPos}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {contextMenu && <CanvasContextMenu position={contextMenu} onDelete={handleDeleteSelectedItems} onClose={() => setContextMenu(null)} />}

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
                  deleteCanvasItem('placeCard', card.id)
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

          {textBoxes.map(textBox => {
            const canDrag = effectiveTool === 'cursor' && !pendingPlaceCard
            const isSelected = selectedItems.some(i => i.id === textBox.id && i.type === 'textBox')
            return (
              <EditableTextBox
                key={textBox.id}
                textBox={textBox}
                draggable={canDrag}
                isSelected={isSelected}
                onEditStart={stopCapturing}
                onEditEnd={stopCapturing}
                onDragEnd={(x, y) => {
                  updateTextBox(textBox.id, { x, y })
                }}
                onChange={updates => {
                  updateTextBox(textBox.id, updates)
                }}
                onMouseDown={e => handleObjectMouseDown(textBox.id, 'textBox', e)}
                onSelect={e => handleObjectClick(e)}
                shapeRef={node => {
                  if (node) {
                    shapeRefs.current.set(textBox.id, node)
                  } else {
                    shapeRefs.current.delete(textBox.id)
                  }
                }}
                onTransformEnd={e => handleTextBoxTransformEnd(textBox, e)}
              />
            )
          })}

          {effectiveTool === 'postIt' && !pendingPlaceCard && cursorPos && (
            <Group x={cursorPos.x - 75} y={cursorPos.y - 75} listening={false}>
              <Rect width={150} height={150} fill="#FFF9C4" opacity={0.6} cornerRadius={8} stroke="#9CA3AF" strokeWidth={2} dash={[5, 5]} />
              <Text x={0} y={65} width={150} text="Click to add" align="center" fill="#6B7280" fontSize={14} />
            </Group>
          )}

          {effectiveTool === 'textBox' && !pendingPlaceCard && cursorPos && (
            <Group x={cursorPos.x - 100} y={cursorPos.y - 25} listening={false}>
              <Rect width={200} height={50} fill="transparent" opacity={0.6} stroke="#9CA3AF" strokeWidth={1} dash={[5, 5]} />
              <Text x={0} y={17} width={200} text="Click to add text" align="center" fill="#6B7280" fontSize={14} />
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
            rotateEnabled={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            flipEnabled={false}
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
