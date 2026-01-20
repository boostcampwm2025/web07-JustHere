import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { PostIt, Line as LineType } from '@/types/canvas.types'
import { cn } from '@/utils/cn'
import { HandBackRightIcon, NoteTextIcon, PencilIcon } from '@/components/Icons'
import EditablePostIt from './EditablePostIt'
import AnimatedCursor from './AnimatedCursor'
import { useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/utils/userStorage'

type ToolType = 'hand' | 'pencil' | 'postIt'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
}

function WhiteboardCanvas({ roomId, canvasId }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // 현재 선택된 도구 상태
  const [activeTool, setActiveTool] = useState<ToolType>('hand')

  // 커서챗 관련 상태
  const [isChatActive, setIsChatActive] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatInputPosition, setChatInputPosition] = useState<{ x: number; y: number } | null>(null)
  const chatInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { slug } = useParams<{ slug: string }>()
  const user = useMemo(() => (slug ? getOrCreateStoredUser(slug) : null), [slug])
  const userName = user ? user.name : 'Unknown User'

  const {
    cursors,
    postits: postIts,
    lines,
    socketId,
    updateCursor,
    sendCursorChat,
    addPostIt,
    updatePostIt,
    addLine,
    updateLine,
  } = useYjsSocket({
    roomId,
    canvasId,
    userName,
  })

  // 포스트잇 Ghost UI 용 마우스 커서 위치 상태
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // 펜 드로잉 관련 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLineId, setCurrentLineId] = useState<string | null>(null)

  // 커서챗 비활성화 함수
  const deactivateCursorChat = useCallback(() => {
    // 타이머 정리
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
      chatInactivityTimerRef.current = null
    }
    setIsChatActive(false)
    setChatMessage('')
    setChatInputPosition(null)
    sendCursorChat(false, '')
  }, [sendCursorChat])

  // 커서챗 비활성화 타이머 리셋 (3초 후 자동 비활성화)
  const resetInactivityTimer = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    chatInactivityTimerRef.current = setTimeout(() => {
      deactivateCursorChat()
    }, 3000)
  }, [deactivateCursorChat])

  // 커서챗 활성화 함수
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

    // 3초 비활성화 타이머 시작
    resetInactivityTimer()
  }, [sendCursorChat, resetInactivityTimer])

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 이미 커서챗이 활성화되어 있으면 무시
      if (isChatActive) return

      // 다른 입력 요소에 포커스가 있으면 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // / 키로 커서챗 활성화
      if (e.key === '/') {
        e.preventDefault()
        activateCursorChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChatActive, activateCursorChat])

  // 커서챗 활성화 시 입력 필드에 포커스
  useEffect(() => {
    if (isChatActive && chatInputRef.current) {
      chatInputRef.current.focus()
    }
  }, [isChatActive])

  // 커서챗 입력 핸들러
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setChatMessage(value)
    sendCursorChat(true, value)
    // 타이핑할 때마다 비활성화 타이머 리셋
    resetInactivityTimer()
  }

  // 커서챗 키 이벤트 핸들러
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // Esc: 즉시 비활성화
      e.preventDefault()
      deactivateCursorChat()
    }
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

      // 커서챗 입력창 위치 업데이트
      if (isChatActive) {
        const pointerPos = stage.getPointerPosition()
        if (pointerPos) {
          setChatInputPosition({ x: pointerPos.x + 20, y: pointerPos.y - 30 })
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
  const handleMouseDown = () => {
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
    <div className={`relative w-full h-full bg-gray-50 ${getCursorStyle()}`}>
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

      {/* 커서챗 입력 UI */}
      {isChatActive && chatInputPosition && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            left: chatInputPosition.x,
            top: chatInputPosition.y,
          }}
        >
          <input
            ref={chatInputRef}
            type="text"
            value={chatMessage}
            onChange={handleChatInputChange}
            onKeyDown={handleChatKeyDown}
            placeholder="메시지 입력..."
            className="px-3 py-1.5 text-sm bg-blue-500 text-white placeholder-blue-200 rounded-lg shadow-lg border-none outline-none min-w-[150px]"
          />
        </div>
      )}

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
      >
        <Layer>
          {/* 펜으로 그린 선 렌더링 */}
          {lines.map(line => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              tension={line.tension}
              lineCap={line.lineCap}
              lineJoin={line.lineJoin}
              globalCompositeOperation={line.tool === 'pen' ? 'source-over' : 'destination-out'}
            />
          ))}

          {/* 포스트잇 렌더링 */}
          {postIts.map(postIt => (
            <EditablePostIt
              key={postIt.id}
              postIt={postIt}
              draggable={activeTool === 'hand'}
              onDragEnd={(x, y) => {
                updatePostIt(postIt.id, { x, y })
              }}
              onChange={updates => {
                updatePostIt(postIt.id, updates)
              }}
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
