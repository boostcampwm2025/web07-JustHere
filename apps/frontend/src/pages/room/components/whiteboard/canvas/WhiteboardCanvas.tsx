import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useParams } from 'react-router-dom'
import { addSocketBreadcrumb, cn, getOrCreateStoredUser } from '@/shared/utils'
import type { PlaceCard, SelectedItem, ToolType } from '@/shared/types'
import { getLineBoundingBox, makeKey, createSelectedItemsSet } from '@/pages/room/utils'
import { DEFAULT_POST_IT_COLOR, PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { useCanvasTransform, useCursorChat, useCanvasKeyboard, useCanvasDraw, useCanvasMouse, useYjsSocket } from '@/pages/room/hooks'
import { AnimatedCursor } from './animated-cursor'
import { CanvasContextMenu } from './canvas-context-menu'
import { CursorChatInput } from './cursor-chat-input'
import { EditablePostIt } from './editable-postit'
import { PlaceCardItem } from './place-card'
import { PostItColorPicker } from './postit-color-picker'
import { EditableTextBox } from './editable-textbox'
import { Toolbar } from './toolbar'
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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const userName = user ? user.name : 'Unknown User'

  const {
    cursors,
    postits: postIts,
    placeCards,
    lines,
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
    zIndexOrder,
    addTextBox,
    updateTextBox,
    deleteCanvasItem,
    moveToTop,
  } = useYjsSocket({
    roomId,
    canvasId,
    userName,
  })

  const { handlePostItTransformEnd, handlePlaceCardTransformEnd, handleTextBoxTransformEnd, handleTransformerDragStart, handleTransformerDragEnd } =
    useCanvasTransform({
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

  // 선택된 포스트잇 ID Set
  const selectedPostItIdsSet = useMemo(
    () => createSelectedItemsSet(selectedItems, { filter: item => item.type === 'postit', keyFn: item => item.id }),
    [selectedItems],
  )

  // PostItColorPicker에 전달하기 위한 배열
  const selectedPostItIds = useMemo(() => Array.from(selectedPostItIdsSet), [selectedPostItIdsSet])

  // 선택된 모든 아이템 Set
  const selectedItemsSet = useMemo(() => createSelectedItemsSet(selectedItems, { keyFn: item => makeKey(item.type, item.id) }), [selectedItems])

  const selectedPostItCurrentFill = useMemo(() => {
    if (selectedPostItIdsSet.size === 0) return undefined

    const fills = Array.from(selectedPostItIdsSet)
      .map(id => postIts.find(p => p.id === id)?.fill)
      .filter((f): f is string => f != null)
    if (fills.length === 0) return undefined

    const first = fills[0]
    return fills.every(f => f === first) ? first : undefined
  }, [selectedPostItIdsSet, postIts])

  const handlePostItColorChange = useCallback(
    (color: string) => {
      selectedPostItIdsSet.forEach(id => {
        updatePostIt(id, { fill: color })
      })
    },
    [selectedPostItIdsSet, updatePostIt],
  )

  const hasSelectedItems = selectedItems.length > 0
  const { isSpacePressed } = useCanvasKeyboard({
    onPlaceCardCanceled,
    hasSelectedItems,
    handleDeleteSelectedItems,
    isChatActive,
    activateCursorChat,
    isDrawing,
    cancelDrawing,
    handleToolChange,
  })
  const effectiveTool = useMemo(() => (isSpacePressed ? 'hand' : activeTool), [isSpacePressed, activeTool])

  const {
    selectionBox,
    isSelecting,
    cursorPos,
    setCursorPos,
    placeCardCursorPos,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleWheel,
    handleStageClick,
    handleObjectMouseDown,
    handleObjectClick,
  } = useCanvasMouse({
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
    isDrawing,
    cancelDrawing,
    startDrawing,
    continueDrawing,
    endDrawing,
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
  })

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    const applyNodes = () => {
      const nodes = selectedItems.map(item => shapeRefs.current.get(makeKey(item.type, item.id))).filter((node): node is Konva.Group => !!node)
      transformer.nodes(nodes)
    }

    const id = requestAnimationFrame(() => {
      applyNodes()
    })
    return () => cancelAnimationFrame(id)
  }, [selectedItems])

  const linesMap = useMemo(() => new Map(lines.map(line => [line.id, line])), [lines])
  const postItsMap = useMemo(() => new Map(postIts.map(postIt => [postIt.id, postIt])), [postIts])
  const placeCardsMap = useMemo(() => new Map(placeCards.map(card => [card.id, card])), [placeCards])
  const textBoxesMap = useMemo(() => new Map(textBoxes.map(textBox => [textBox.id, textBox])), [textBoxes])

  const cursorStyle = useMemo(() => {
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
  }, [pendingPlaceCard, effectiveTool])

  const canDrag = useMemo(() => effectiveTool === 'cursor' && !pendingPlaceCard, [effectiveTool, pendingPlaceCard])

  return (
    <div className={cn('relative w-full h-full bg-slate-50', cursorStyle)} onContextMenu={e => e.preventDefault()} role="presentation">
      <Toolbar
        effectiveTool={effectiveTool}
        setActiveTool={handleToolChange}
        setCursorPos={setCursorPos}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {selectedPostItIds.length > 0 && (
        <PostItColorPicker selectedPostItIds={selectedPostItIds} currentFill={selectedPostItCurrentFill} onColorChange={handlePostItColorChange} />
      )}

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
          {zIndexOrder.map(({ type, id }) => {
            if (type === 'line') {
              const line = linesMap.get(id)
              if (!line) return null

              const box = getLineBoundingBox(line.points)

              return (
                <Group
                  key={makeKey('line', line.id)}
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  draggable={canDrag}
                  ref={node => {
                    if (node) {
                      shapeRefs.current.set(makeKey('line', line.id), node)
                    } else {
                      shapeRefs.current.delete(makeKey('line', line.id))
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
            }

            if (type === 'postit') {
              const postIt = postItsMap.get(id)
              if (!postIt) return null

              return (
                <EditablePostIt
                  key={makeKey('postit', postIt.id)}
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
                      shapeRefs.current.set(makeKey('postit', postIt.id), node)
                    } else {
                      shapeRefs.current.delete(makeKey('postit', postIt.id))
                    }
                  }}
                  onTransformEnd={e => handlePostItTransformEnd(postIt, e)}
                />
              )
            }

            if (type === 'placeCard') {
              const card = placeCardsMap.get(id)
              if (!card) return null

              return (
                <PlaceCardItem
                  key={makeKey('placeCard', card.id)}
                  card={card}
                  draggable={canDrag}
                  onDragEnd={(x, y) => {
                    updatePlaceCard(card.id, { x, y })
                  }}
                  onMouseDown={e => handleObjectMouseDown(card.id, 'placeCard', e)}
                  onClick={e => handleObjectClick(e)}
                  onContextMenu={e => handleObjectClick(e)}
                  shapeRef={node => {
                    if (node) {
                      shapeRefs.current.set(makeKey('placeCard', card.id), node)
                    } else {
                      shapeRefs.current.delete(makeKey('placeCard', card.id))
                    }
                  }}
                  onTransformEnd={e => handlePlaceCardTransformEnd(card, e)}
                />
              )
            }

            if (type === 'textBox') {
              const textBox = textBoxesMap.get(id)
              if (!textBox) return null

              const isSelected = selectedItemsSet.has(makeKey('textBox', textBox.id))
              return (
                <EditableTextBox
                  key={makeKey('textBox', textBox.id)}
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
                      shapeRefs.current.set(makeKey('textBox', textBox.id), node)
                    } else {
                      shapeRefs.current.delete(makeKey('textBox', textBox.id))
                    }
                  }}
                  onTransformEnd={e => handleTextBoxTransformEnd(textBox, e)}
                />
              )
            }

            return null
          })}

          {effectiveTool === 'postIt' && !pendingPlaceCard && cursorPos && (
            <Group x={cursorPos.x - 75} y={cursorPos.y - 75} listening={false}>
              <Rect
                width={150}
                height={150}
                fill={DEFAULT_POST_IT_COLOR}
                opacity={0.6}
                cornerRadius={8}
                stroke="#9CA3AF"
                strokeWidth={2}
                dash={[5, 5]}
              />
              <Text x={0} y={65} width={150} text="클릭해서 추가하기" align="center" fill="#6B7280" fontSize={14} />
            </Group>
          )}

          {effectiveTool === 'textBox' && !pendingPlaceCard && cursorPos && (
            <Group x={cursorPos.x - 100} y={cursorPos.y - 25} listening={false}>
              <Rect width={200} height={50} fill="transparent" opacity={0.6} stroke="#9CA3AF" strokeWidth={1} dash={[5, 5]} />
              <Text x={0} y={17} width={200} text="클릭해서 추가하기" align="center" fill="#6B7280" fontSize={14} />
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
