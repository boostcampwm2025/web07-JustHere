import CanvasContextMenu from '@/components/main/CanvasContextMenu'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { PostIt, Line as LineType, PlaceCard, SelectedItem, CanvasItemType, ToolType, SelectionBox, BoundingBox } from '@/types/canvas.types'
import { cn } from '@/utils/cn'
import { CursorIcon, HandBackRightIcon, NoteTextIcon, PencilIcon } from '@/components/Icons'
import EditablePostIt from './EditablePostIt'
import AnimatedCursor from './AnimatedCursor'
import PlaceCardItem from './PlaceCardItem'
import CursorChatInput from './CursorChatInput'
import { useParams } from 'react-router-dom'
import { getOrCreateStoredUser } from '@/utils/userStorage'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
  onPlaceCardPlaced: () => void
  onPlaceCardCanceled: () => void
}

const PLACE_CARD_WIDTH = 240
const PLACE_CARD_HEIGHT = 180

// 드로잉 객체의 Bounding Box 계산 함수
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

// 여러 BoundingBox를 합쳐서 하나의 통합 BoundingBox 계산
const getMergedBoundingBox = (boxes: BoundingBox[]): BoundingBox | null => {
  if (boxes.length === 0) return null

  const minX = Math.min(...boxes.map(b => b.x))
  const minY = Math.min(...boxes.map(b => b.y))
  const maxX = Math.max(...boxes.map(b => b.x + b.width))
  const maxY = Math.max(...boxes.map(b => b.y + b.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// 선택 영역과 Bounding Box의 충돌 감지 함수
const isBoxIntersecting = (selectionBox: SelectionBox, boundingBox: BoundingBox): boolean => {
  // 선택 영역의 정규화 (start가 end보다 클 수 있으므로)
  const selMinX = Math.min(selectionBox.startX, selectionBox.endX)
  const selMaxX = Math.max(selectionBox.startX, selectionBox.endX)
  const selMinY = Math.min(selectionBox.startY, selectionBox.endY)
  const selMaxY = Math.max(selectionBox.startY, selectionBox.endY)

  // Bounding Box의 경계
  const boxMinX = boundingBox.x
  const boxMaxX = boundingBox.x + boundingBox.width
  const boxMinY = boundingBox.y
  const boxMaxY = boundingBox.y + boundingBox.height

  // AABB 충돌 감지
  return selMinX <= boxMaxX && selMaxX >= boxMinX && selMinY <= boxMaxY && selMaxY >= boxMinY
}

function WhiteboardCanvas({ roomId, canvasId, pendingPlaceCard, onPlaceCardPlaced, onPlaceCardCanceled }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)

  // 현재 선택된 도구 상태
  const [activeTool, setActiveTool] = useState<ToolType>('cursor')

  // 선택된 캔버스 UI 객체 (다중 선택 지원)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  // 드래그 선택 영역 상태
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  // 컨텍스트 메뉴 (우클릭 팝오버)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 포스트잇 Ghost UI 용 마우스 커서 위치 상태
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // 펜 드로잉 관련 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLineId, setCurrentLineId] = useState<string | null>(null)

  // 현재 드래그 중인지 여부 (단일 라인 드래그용)
  const [isDragging, setIsDragging] = useState(false)

  // 배치 중 마우스 따라다니는 카드 위치
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

  // 커서챗 관련 상태
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
    updateCursor,
    sendCursorChat,
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

  // Backspace 키를 통한 삭제 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중일 때는 삭제 방지 (textarea 등)
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

  // 객체 선택 핸들러 (mouseDown에서 호출 - 즉시 선택 전환)
  const handleObjectMouseDown = useCallback(
    (id: string, type: CanvasItemType, e: Konva.KonvaEventObject<MouseEvent>) => {
      // 장소 카드 배치 중에는 객체 선택/이벤트 차단
      if (pendingPlaceCard) return

      // Cursor 툴이 아니면 무시
      if (activeTool !== 'cursor') return

      // 이벤트 버블링 방지 (Stage mouseDown 방지)
      e.cancelBubble = true

      const isAlreadySelected = selectedItems.some(item => item.id === id && item.type === type)
      // 선택되지 않은 요소를 클릭하면 해당 요소만 선택 (기존 선택 해제)
      if (!isAlreadySelected) {
        setSelectedItems([{ id, type }])
      }
    },
    [activeTool, pendingPlaceCard, selectedItems],
  )

  // 객체 클릭 핸들러 (click/contextMenu에서 호출 - 우클릭 메뉴 처리)
  const handleObjectClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // 장소 카드 배치 중에는 객체 선택/이벤트 차단
      if (pendingPlaceCard) return

      // Cursor 툴이 아니면 무시
      if (activeTool !== 'cursor') return

      // 이벤트 버블링 방지 (Stage 클릭 방지)
      e.cancelBubble = true

      // 우클릭인 경우 컨텍스트 메뉴 표시
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
        // 좌클릭이면 컨텍스트 메뉴 닫기
        setContextMenu(null)
      }
    },
    [activeTool, pendingPlaceCard],
  )

  // 배경 클릭 시 선택 해제
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Stage 자체를 클릭했을 때만 (객체 클릭 제외)
    if (e.target === e.target.getStage()) {
      setSelectedItems([])
      setContextMenu(null)
    }
  }

  // 메뉴에서 삭제 클릭 시
  const handleDeleteFromMenu = () => {
    selectedItems.forEach(item => {
      if (item.type === 'postit') deletePostIt(item.id)
      if (item.type === 'line') deleteLine(item.id)
      if (item.type === 'placeCard') removePlaceCard(item.id)
    })
    setSelectedItems([])
    setContextMenu(null)
  }

  // 커서챗 완전 비활성화 함수 (fade-out 애니메이션 후 호출)
  const deactivateCursorChat = useCallback(() => {
    // 타이머 정리
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

  // fade-out 애니메이션 시작 함수
  const startFadeOut = useCallback(() => {
    setIsChatFading(true)
    // 3초간 fade-out 애니메이션 후 완전 비활성화
    chatFadeTimerRef.current = setTimeout(() => {
      deactivateCursorChat()
    }, 3000)
  }, [deactivateCursorChat])

  // 커서챗 비활성화 타이머 리셋 (3초 후 fade-out 시작)
  const resetInactivityTimer = useCallback(() => {
    // 기존 타이머들 정리
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    // fade-out 중이었다면 즉시 다시 활성화 (opacity 복구)
    setIsChatFading(false)

    // 3초 후 fade-out 시작
    chatInactivityTimerRef.current = setTimeout(() => {
      startFadeOut()
    }, 3000)
  }, [startFadeOut])

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
      if (activeTool === 'postIt' && !pendingPlaceCard) {
        setCursorPos(canvasPos)
      }

      if (pendingPlaceCard) {
        setPlaceCardCursorPos({ ...canvasPos, cardId: pendingPlaceCard.id })
      }

      // 드래그 선택 중이면 선택 영역 업데이트
      // 함수형 업데이트를 사용하여 stale closure 문제 방지
      if (activeTool === 'cursor' && isSelecting) {
        setSelectionBox(prev => {
          if (!prev) return null
          return {
            ...prev,
            endX: canvasPos.x,
            endY: canvasPos.y,
          }
        })
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
    if (pendingPlaceCard) {
      setPlaceCardCursorPos(null)
    }
    // 캔버스 밖으로 나가면 드로잉 종료
    if (isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
    }
  }

  // 마우스 다운 이벤트 (드로잉 시작, 포스트잇 추가, 장소 카드 추가, 드래그 선택 시작)
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
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

    if (pendingPlaceCard) {
      addPlaceCard({
        ...pendingPlaceCard,
        x: canvasPos.x - PLACE_CARD_WIDTH / 2,
        y: canvasPos.y - PLACE_CARD_HEIGHT / 2,
      })
      onPlaceCardPlaced()
      return
    }

    // Cursor 모드일 때 Stage 빈 공간 클릭 시 드래그 선택 시작
    if (activeTool === 'cursor') {
      // Stage 자체를 클릭했을 때만 (객체 클릭은 handleObjectSelect에서 처리)
      if (e.target === e.target.getStage()) {
        setIsSelecting(true)
        setSelectionBox({
          startX: canvasPos.x,
          startY: canvasPos.y,
          endX: canvasPos.x,
          endY: canvasPos.y,
        })
        setSelectedItems([]) // 기존 선택 해제
      }
      return
    }

    // Hand 모드일 때는 Stage 드래그이므로 패스
    if (activeTool === 'hand') return

    // 포스트잇 추가 (커서를 중앙으로)
    if (activeTool === 'postIt') {
      const newPostIt: PostIt = {
        id: `postIt-${crypto.randomUUID()}`,
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
      const newLineId = `line-${crypto.randomUUID()}`
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

  // 마우스 업 이벤트 (드로잉 종료, 드래그 선택 완료)
  const handleMouseUp = () => {
    // 펜 드로잉 종료
    if (activeTool === 'pencil' && isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
    }

    // 드래그 선택 종료 및 충돌 감지
    // 함수형 업데이트를 사용하여 최신 selectionBox 값으로 충돌 감지
    if (activeTool === 'cursor' && isSelecting) {
      setSelectionBox(currentSelectionBox => {
        if (!currentSelectionBox) return null

        const newSelectedItems: SelectedItem[] = []

        // 포스트잇 충돌 감지
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

        // 장소 카드 충돌 감지
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

        // 라인 충돌 감지
        lines.forEach(line => {
          const lineBox = getLineBoundingBox(line.points)
          if (isBoxIntersecting(currentSelectionBox, lineBox)) {
            newSelectedItems.push({ id: line.id, type: 'line' })
          }
        })

        setSelectedItems(newSelectedItems)
        return null // selectionBox를 null로 설정
      })
      setIsSelecting(false)
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

  // 선택된 라인 ID 목록
  const selectedLineIds = useMemo(() => selectedItems.filter(item => item.type === 'line').map(item => item.id), [selectedItems])

  // 다중 선택 시 통합 Bounding Box 계산
  const multiSelectionBoundingBox = useMemo(() => {
    if (selectedItems.length < 2) return null

    const boxes: BoundingBox[] = []

    selectedItems.forEach(item => {
      if (item.type === 'postit') {
        const postIt = postIts.find(p => p.id === item.id)
        if (postIt) {
          boxes.push({ x: postIt.x, y: postIt.y, width: postIt.width, height: postIt.height })
        }
      } else if (item.type === 'placeCard') {
        const card = placeCards.find(c => c.id === item.id)
        if (card) {
          boxes.push({ x: card.x, y: card.y, width: PLACE_CARD_WIDTH, height: PLACE_CARD_HEIGHT })
        }
      } else if (item.type === 'line') {
        const line = lines.find(l => l.id === item.id)
        if (line) {
          boxes.push(getLineBoundingBox(line.points))
        }
      }
    })

    return getMergedBoundingBox(boxes)
  }, [selectedItems, postIts, placeCards, lines])

  const handleMultiDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const groupNode = e.target
      const dx = groupNode.x()
      const dy = groupNode.y()

      // delta가 0이면 실제 이동이 없으므로 스킵
      if (dx === 0 && dy === 0) {
        return
      }

      // 선택된 모든 객체의 위치를 delta만큼 이동
      selectedItems.forEach(item => {
        if (item.type === 'postit') {
          const postIt = postIts.find(p => p.id === item.id)
          if (postIt) {
            updatePostIt(item.id, { x: postIt.x + dx, y: postIt.y + dy })
          }
        } else if (item.type === 'placeCard') {
          const card = placeCards.find(c => c.id === item.id)
          if (card) {
            updatePlaceCard(item.id, { x: card.x + dx, y: card.y + dy })
          }
        } else if (item.type === 'line') {
          const line = lines.find(l => l.id === item.id)
          if (line) {
            const newPoints = line.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy))
            updateLine(item.id, { points: newPoints })
          }
        }
      })

      // Konva 노드 위치 리셋
      groupNode.position({ x: 0, y: 0 })
    },
    [selectedItems, postIts, placeCards, lines, updatePostIt, updatePlaceCard, updateLine],
  )

  // 드로잉 객체에 대한 Focus Box 렌더링 (다중 선택 지원)
  const renderLineFocus = useMemo(() => {
    // 선택된 라인이 없으면 렌더링 X
    if (selectedLineIds.length === 0) return null

    // 다중 선택 시에는 개별 라인 드래그 비활성화 (그룹 드래그 사용)
    const canDragIndividually = activeTool === 'cursor' && selectedItems.length === 1

    return selectedLineIds.map(lineId => {
      const line = lines.find(l => l.id === lineId)
      if (!line) return null

      const box = getLineBoundingBox(line.points)
      const padding = 5

      return (
        <Group
          key={`focus-group-${line.id}`}
          draggable={canDragIndividually}
          // 드래그 시작 시 원본 숨김 처리 시작
          onDragStart={() => setIsDragging(true)}
          // 드래그 종료 핸들러 연결
          onDragEnd={e => handleLineGroupDragEnd(e, line)}
          // mouseDown에서 즉시 선택 전환
          onMouseDown={e => handleObjectMouseDown(line.id, 'line', e)}
          // 우클릭 메뉴 이벤트 전파
          onContextMenu={e => handleObjectClick(e)}
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
    })
  }, [selectedLineIds, selectedItems.length, lines, activeTool, handleLineGroupDragEnd, handleObjectMouseDown, handleObjectClick])

  /**
   * 도구에 따른 커서 스타일 반환
   */
  const getCursorStyle = () => {
    if (pendingPlaceCard) {
      return 'cursor-crosshair'
    }
    switch (activeTool) {
      case 'cursor':
        return 'cursor-default'
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
              setActiveTool('cursor')
              setCursorPos(null)
            }}
            className={getButtonStyle('cursor')}
            title="선택"
          >
            <CursorIcon className="w-5 h-5" />
          </button>

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

      {/* 커서챗 입력 UI */}
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
        // 손 도구일 때만 캔버스 전체 드래그(Pan) 가능
        draggable={!pendingPlaceCard && activeTool === 'hand'}
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
            const isTargetLine = selectedLineIds.includes(line.id)
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
                // 드래그 중이면 투명도를 0로 낮춤 (위치 변경 전 드로잉 라인이 보이지 않게)
                opacity={shouldDim ? 0 : 1}
                // mouseDown에서 즉시 선택 전환
                onMouseDown={e => handleObjectMouseDown(line.id, 'line', e)}
                // click/contextMenu에서 메뉴 처리
                onClick={e => handleObjectClick(e)}
                onContextMenu={e => handleObjectClick(e)}
                // 라인은 얇아서 클릭이 어려울 수 있으므로 hitStrokeWidth 추가
                hitStrokeWidth={20}
              />
            )
          })}

          {/* 라인 선택 시 Focus Box 렌더링 */}
          {renderLineFocus}

          {/* 포스트잇 렌더링 */}
          {postIts.map(postIt => {
            const isSelected = selectedItems.some(item => item.id === postIt.id && item.type === 'postit')
            const canDrag = activeTool === 'cursor' && !pendingPlaceCard

            return (
              <EditablePostIt
                key={postIt.id}
                postIt={postIt}
                draggable={canDrag}
                isSelected={isSelected}
                onDragEnd={(x, y) => {
                  updatePostIt(postIt.id, { x, y })
                }}
                onChange={updates => {
                  updatePostIt(postIt.id, updates)
                }}
                onMouseDown={e => handleObjectMouseDown(postIt.id, 'postit', e)}
                onSelect={e => handleObjectClick(e)}
              />
            )
          })}

          {/* 장소 카드 렌더링 */}
          {placeCards.map(card => {
            const isSelected = selectedItems.some(item => item.id === card.id && item.type === 'placeCard')
            const canDrag = activeTool === 'cursor' && !pendingPlaceCard

            return (
              <PlaceCardItem
                key={card.id}
                card={card}
                draggable={canDrag}
                isSelected={isSelected}
                onDragEnd={(x, y) => {
                  updatePlaceCard(card.id, { x, y })
                }}
                onRemove={() => {
                  removePlaceCard(card.id)
                }}
                onMouseDown={e => handleObjectMouseDown(card.id, 'placeCard', e)}
                onClick={e => handleObjectClick(e)}
                onContextMenu={e => handleObjectClick(e)}
              />
            )
          })}

          {/* 고스트 포스트잇 (미리보기) */}
          {activeTool === 'postIt' && !pendingPlaceCard && cursorPos && (
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

          {/* 장소 카드 고스트 (미리보기) */}
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

          {/* 드래그 선택 영역 (투명 사각형) */}
          {isSelecting && selectionBox && (
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              fill="rgba(59, 130, 246, 0.1)" // 파란색 투명 배경
              stroke="#3b82f6" // 파란색 테두리
              strokeWidth={1}
              dash={[4, 4]} // 점선 효과
              listening={false} // 클릭 이벤트를 가로채지 않도록
            />
          )}

          {/* 다중 선택 드래그 오버레이 */}
          {multiSelectionBoundingBox && selectedItems.length >= 2 && !isSelecting && (
            <Group
              x={0}
              y={0}
              draggable={activeTool === 'cursor'}
              onDragEnd={handleMultiDragEnd}
              onContextMenu={e => {
                // 다중 선택 요소에서 우클릭 시 컨텍스트 메뉴 표시
                if (activeTool !== 'cursor') return
                e.cancelBubble = true
                e.evt.preventDefault()
                setContextMenu({ x: e.evt.clientX, y: e.evt.clientY })
              }}
            >
              {/* 드래그 영역 (투명하지만 클릭 가능) */}
              <Rect
                x={multiSelectionBoundingBox.x - 10}
                y={multiSelectionBoundingBox.y - 10}
                width={multiSelectionBoundingBox.width + 20}
                height={multiSelectionBoundingBox.height + 20}
                fill="transparent"
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[6, 4]}
                cornerRadius={4}
              />
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
