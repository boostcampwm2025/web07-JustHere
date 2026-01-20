import CanvasContextMenu from '@/components/main/CanvasContextMenu'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Group, Line, Text } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { PostIt, Line as LineType } from '@/types/canvas.types'
import { cn } from '@/utils/cn'
import { HandBackRightIcon, NoteTextIcon, PencilIcon } from '@/components/Icons'
import EditablePostIt from './EditablePostIt'
import AnimatedCursor from './AnimatedCursor'

type ToolType = 'hand' | 'pencil' | 'postIt'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
}

// 드로잉 객체의 Bounding Box 계산 함수
const getLineBoundingBox = (points: number[]) => {
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

function WhiteboardCanvas({ roomId, canvasId }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  // 현재 선택된 도구 상태
  const [activeTool, setActiveTool] = useState<ToolType>('hand')

  // 선택된 캔버스 UI 객체
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'postit' | 'line' | null>(null)

  // 컨텍스트 메뉴 (우클릭 팝오버)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 포스트잇 Ghost UI 용 마우스 커서 위치 상태
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // 펜 드로잉 관련 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLineId, setCurrentLineId] = useState<string | null>(null)

  // 현재 드래그 중인지 여부
  const [isDragging, setIsDragging] = useState(false)

  const {
    cursors,
    rectangles,
    postits: postIts,
    lines,
    socketId,
    updateCursor,
    updateRectangle,
    addPostIt,
    updatePostIt,
    deletePostIt,
    addLine,
    updateLine,
    deleteLine,
  } = useYjsSocket({
    roomId,
    canvasId,
  })

  // Backspace 키를 통한 삭제 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중일 때는 삭제 방지 (textarea 등)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === 'Backspace' && selectedId) {
        if (selectedType === 'postit') deletePostIt(selectedId)
        if (selectedType === 'line') deleteLine(selectedId)

        // 삭제 후 선택 해제
        setSelectedId(null)
        setSelectedType(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, selectedType, deletePostIt, deleteLine])

  // 객체 선택 핸들러 (좌클릭/우클릭 공통)
  const handleObjectSelect = (id: string, type: 'postit' | 'line', e: Konva.KonvaEventObject<MouseEvent>) => {
    // 1. Hand 툴이 아니면 무시
    if (activeTool !== 'hand') return

    // 2. 이벤트 버블링 방지 (Stage 클릭 방지)
    e.cancelBubble = true

    // 3. 선택 상태 설정
    setSelectedId(id)
    setSelectedType(type)

    // 4. 우클릭인 경우 컨텍스트 메뉴 표시
    if (e.evt.button === 2) {
      e.evt.preventDefault() // 브라우저 기본 우클릭 메뉴 방지
      const stage = stageRef.current
      if (stage) {
        // Stage 내 좌표가 아닌 브라우저 화면 기준(Pointer) 좌표 사용 (HTML Overlay용)
        const pointerPos = stage.getRelativePointerPosition()
        if (pointerPos) {
          // Stage의 위치와 스케일을 고려하지 않고, 화면 절대 좌표(Overlay)를 위해 Konva 이벤트의 clientX, clientY를 사용하거나 계산 필요.
          setContextMenu({ x: e.evt.clientX, y: e.evt.clientY })
        }
      }
    } else {
      // 좌클릭이면 컨텍스트 메뉴 닫기
      setContextMenu(null)
    }
  }

  // 배경 클릭 시 선택 해제
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Stage 자체를 클릭했을 때만 (객체 클릭 제외)
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
      setSelectedType(null)
      setContextMenu(null)
    }
  }

  // 메뉴에서 삭제 클릭 시
  const handleDeleteFromMenu = () => {
    if (selectedId && selectedType) {
      if (selectedType === 'postit') deletePostIt(selectedId)
      if (selectedType === 'line') deleteLine(selectedId)
    }
    setSelectedId(null)
    setSelectedType(null)
    setContextMenu(null)
  }

  // 마우스 이동 시 커서 위치 업데이트
  const handleMouseMove = () => {
    const stage = stageRef.current
    if (!stage) return

    // Stage 변환(scale, position)을 자동으로 반영한 캔버스 좌표
    const canvasPos = stage.getRelativePointerPosition()
    if (canvasPos) {
      // 실시간 커서 동기화 (캔버스 좌표)
      updateCursor(canvasPos.x, canvasPos.y)

      // 포스트잇 고스트 UI 업데이트 (캔버스 좌표)
      if (activeTool === 'postIt') {
        setCursorPos(canvasPos)
      }

      // 펜 드로잉 중이면 포인트 추가
      if (activeTool === 'pencil' && isDrawing && currentLineId) {
        // 현재 그리고 있는 선 찾기
        const currentLine = lines.find(line => line.id === currentLineId)
        if (currentLine) {
          // 기존 points 배열에 새 좌표 추가
          const newPoints = [...currentLine.points, canvasPos.x, canvasPos.y]
          updateLine(currentLineId, { points: newPoints })
        }
      }
    }
  }

  // 마우스 나갈 때 포스트잇 고스트 제거 및 드로잉 종료
  const handleMouseLeave = () => {
    if (activeTool === 'postIt') {
      setCursorPos(null)
    }
    // 캔버스 밖으로 나가면 드로잉 종료
    if (isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
    }
  }

  // 마우스 다운 이벤트 (드로잉 시작, 포스트잇 추가)
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Hand 모드일 때는 Stage 드래그 혹은 객체 선택이므로 패스
    if (activeTool === 'hand') return

    // 우클릭은 드로잉/생성 로직 실행 안 함
    const isMouseEvent = e.evt.type.startsWith('mouse')
    if (isMouseEvent) {
      const mouseEvt = e.evt as MouseEvent
      if (mouseEvt.button === 2) return
    }

    const stage = stageRef.current
    if (!stage) return

    // Stage 변환(scale, position)을 자동으로 반영한 캔버스 좌표
    const canvasPos = stage.getRelativePointerPosition()
    if (!canvasPos) return

    // 포스트잇 추가 (커서를 중앙으로)
    if (activeTool === 'postIt') {
      const newPostIt: PostIt = {
        id: `postIt-${Date.now()}`,
        x: canvasPos.x - 75, // 중앙 정렬 (width / 2)
        y: canvasPos.y - 75, // 중앙 정렬 (height / 2)
        width: 150,
        height: 150,
        fill: '#FFF9C4', // 노란색 포스트잇
        text: '내용을 입력하세요',
        authorName: `User ${socketId.substring(0, 4)}`,
      }
      addPostIt(newPostIt)
    }

    // 펜 드로잉 시작
    if (activeTool === 'pencil') {
      setIsDrawing(true)
      const newLineId = `line-${Date.now()}`
      setCurrentLineId(newLineId)

      const newLine: LineType = {
        id: newLineId,
        points: [canvasPos.x, canvasPos.y], // 시작점
        stroke: '#000000', // 검은색
        strokeWidth: 2,
        tension: 0.5, // 부드러운 곡선
        lineCap: 'round',
        lineJoin: 'round',
        tool: 'pen',
      }
      addLine(newLine)
    }
  }

  // 마우스 업 이벤트 (드로잉 종료)
  const handleMouseUp = () => {
    if (activeTool === 'pencil' && isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
    }
  }

  // 휠 이벤트로 확대/축소 (Cmd/Ctrl + Scroll)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    // Cmd(Mac) 또는 Ctrl(Windows) 키가 눌렸는지 확인
    if (!e.evt.metaKey && !e.evt.ctrlKey) {
      return
    }

    const stage = stageRef.current
    if (!stage) return

    const scaleBy = 1.05
    const oldScale = stage.scaleX()
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

    // 최소 0.1배, 최대 5배로 제한
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

  // 드로잉 라인 객체 드래그 핸들러
  const handleLineGroupDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, line: LineType) => {
      setIsDragging(false)

      const groupNode = e.target

      // 그룹이 이동한 거리
      // Group은 처음에 (0,0)에 렌더링되므로, dragEnd 시점의 x(), y()가 곧 이동 거리
      const dx = groupNode.x()
      const dy = groupNode.y()

      // 2. 라인의 모든 점을 Delta만큼 이동
      const newPoints = line.points.map((p, i) => {
        // 짝수 인덱스(x), 홀수 인덱스(y)
        return i % 2 === 0 ? p + dx : p + dy
      })

      updateLine(line.id, { points: newPoints })

      // 4. [중요] Konva 노드 위치 리셋
      groupNode.position({ x: 0, y: 0 })
    },
    [updateLine],
  )

  // 드로잉 객체에 대한 Focus Box 렌더링
  const renderLineFocus = useMemo(() => {
    // 1. 선택된 라인이 없으면 렌더링 X
    if (selectedType !== 'line' || !selectedId) return null

    const line = lines.find(l => l.id === selectedId)
    if (!line) return null

    const box = getLineBoundingBox(line.points)
    const padding = 5

    return (
      <Group
        key={`focus-group-${line.id}`}
        draggable={activeTool === 'hand'}
        // 드래그 시작 시 원본 숨김 처리 시작
        onDragStart={() => setIsDragging(true)}
        // 드래그 종료 핸들러 연결
        onDragEnd={e => handleLineGroupDragEnd(e, line)}
        // 우클릭 메뉴 이벤트 전파
        onContextMenu={e => handleObjectSelect(line.id, 'line', e)}
        // 초기 위치는 항상 (0,0) 절대 좌표 기준
        x={0}
        y={0}
      >
        {/* 드래그 시 시각적으로 따라올 Ghost Line */}
        <Line
          points={line.points}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          tension={line.tension}
          lineCap={line.lineCap}
          lineJoin={line.lineJoin}
          opacity={1}
          listening={false} // 이벤트는 그룹이나 박스가 받음
        />

        {/* [Focus Box] 선택 테두리 */}
        <Rect
          x={box.x - padding}
          y={box.y - padding}
          width={box.width + padding * 2}
          height={box.height + padding * 2}
          stroke="#3b82f6" // Primary Blue
          strokeWidth={1.5}
          dash={[4, 4]} // 점선 처리
          // 박스 내부를 투명색으로 채워야 마우스로 잡기 편함
          fill="transparent"
        />
      </Group>
    )
  }, [selectedId, selectedType, lines, activeTool, handleLineGroupDragEnd, handleObjectSelect])

  /**
   * 도구에 따른 커서 스타일 반환
   */
  const getCursorStyle = () => {
    switch (activeTool) {
      case 'hand':
        return 'cursor-grab active:cursor-grabbing'
      case 'pencil':
        return 'cursor-crosshair' // 십자 커서
      case 'postIt':
        return 'cursor-pointer' // 포인터 커서
      default:
        return 'cursor-default'
    }
  }

  const getButtonStyle = (tool: ToolType) => {
    return cn(
      'p-2.5 rounded-full transition-all duration-200',
      activeTool === tool ? 'text-primary' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900',
    )
  }

  return (
    <div
      className={`relative w-full h-full bg-gray-50 ${getCursorStyle()}`}
      onContextMenu={e => e.preventDefault()} // 캔버스 전체 우클릭 메뉴 방지
    >
      {/* 상단 중앙 도구 토글 UI */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center p-1.5 bg-white rounded-full shadow-xl border border-gray-200 gap-1">
          <button
            onClick={() => {
              setActiveTool('hand')
              setCursorPos(null)
            }}
            className={getButtonStyle('hand')}
            title="화면 이동"
          >
            <HandBackRightIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setActiveTool('pencil')
              setCursorPos(null)
            }}
            className={getButtonStyle('pencil')}
            title="그리기"
          >
            <PencilIcon className="w-5 h-5" />
          </button>

          <button onClick={() => setActiveTool('postIt')} className={getButtonStyle('postIt')} title="포스트잇 추가">
            <NoteTextIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 우클릭 Context Menu (Popover) */}
      {contextMenu && <CanvasContextMenu position={contextMenu} onDelete={handleDeleteFromMenu} onClose={() => setContextMenu(null)} />}

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        // 손 도구일 때만 캔버스 전체 드래그(Pan) 가능
        draggable={activeTool === 'hand'}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        // Stage 클릭 시 선택 해제 (빈 공간 클릭)
        onClick={handleStageClick}
        // 모바일 터치 고려
        onTap={handleStageClick}
        // 캔버스 우클릭 기본 메뉴 방지
        onContextMenu={e => e.evt.preventDefault()}
      >
        <Layer>
          {/* 펜으로 그린 선 렌더링 */}
          {lines.map(line => {
            // 현재 라인이 선택되었고, 드래그 중인가?
            const isTargetLine = selectedId === line.id && selectedType === 'line'
            const shouldDim = isTargetLine && isDragging

            return (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                tension={line.tension}
                lineCap={line.lineCap}
                lineJoin={line.lineJoin}
                globalCompositeOperation={line.tool === 'pen' ? 'source-over' : 'destination-out'}
                // 드래그 중이면 투명도를 0.2로 낮춤 (흐리게)
                opacity={shouldDim ? 0 : 1}
                // 라인 선택 (좌클릭/우클릭)
                onClick={e => handleObjectSelect(line.id, 'line', e)}
                onContextMenu={e => handleObjectSelect(line.id, 'line', e)}
                // 라인은 얇아서 클릭이 어려울 수 있으므로 hitStrokeWidth 추가
                hitStrokeWidth={20}
              />
            )
          })}

          {/* 라인 선택 시 Focus Box 렌더링 */}
          {renderLineFocus}

          {/* 기존 네모 렌더링 (레거시, 삭제 예정) */}
          {rectangles.map(shape => (
            <Rect
              key={shape.id}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill={shape.fill}
              shadowBlur={5}
              cornerRadius={8}
              // 손 도구일 때만 개별 객체 드래그 가능
              draggable={activeTool === 'hand'}
              onDragEnd={e => {
                updateRectangle(shape.id, {
                  x: e.target.x(),
                  y: e.target.y(),
                })
              }}
            />
          ))}

          {/* 포스트잇 렌더링 */}
          {postIts.map(postIt => (
            <EditablePostIt
              key={postIt.id}
              postIt={postIt}
              draggable={activeTool === 'hand'}
              isSelected={selectedId === postIt.id && selectedType === 'postit'}
              onDragEnd={(x, y) => {
                updatePostIt(postIt.id, { x, y })
              }}
              onChange={updates => {
                updatePostIt(postIt.id, updates)
              }}
              onSelect={e => handleObjectSelect(postIt.id, 'postit', e)}
            />
          ))}

          {/* 고스트 포스트잇 (미리보기) */}
          {activeTool === 'postIt' && cursorPos && (
            <Group
              x={cursorPos.x - 75} // 마우스 중앙 정렬 (150 / 2)
              y={cursorPos.y - 75}
              listening={false} // 클릭 이벤트를 가로채지 않도록 설정 (클릭 통과)
            >
              <Rect
                width={150}
                height={150}
                fill="#FFF9C4" // 기본 노란색
                opacity={0.6} // 반투명 효과
                cornerRadius={8}
                stroke="#9CA3AF" // 회색 테두리
                strokeWidth={2}
                dash={[5, 5]} // 점선 효과로 '임시'임을 강조
              />
              <Text x={0} y={65} width={150} text="Click to add" align="center" fill="#6B7280" fontSize={14} />
            </Group>
          )}

          {/* 다른 사용자의 커서 렌더링 (애니메이션 적용) */}
          {Array.from(cursors.values()).map(cursor => (
            <AnimatedCursor key={cursor.socketId} cursor={cursor} />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

export default WhiteboardCanvas
