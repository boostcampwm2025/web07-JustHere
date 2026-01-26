import CanvasContextMenu from '@/components/main/CanvasContextMenu'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Group, Line, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { PostIt, Line as LineType, PlaceCard, SelectedItem, CanvasItemType, ToolType, SelectionBox, BoundingBox } from '@/types/canvas.types'
import { cn } from '@/utils/cn'
import { CursorIcon, HandBackRightIcon, NoteTextIcon, PencilIcon, RedoIcon, UndoIcon } from '@/components/Icons'
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

type DragInitialState = { type: 'postit' | 'placeCard'; x: number; y: number } | { type: 'line'; points: number[] }

function WhiteboardCanvas({ roomId, canvasId, pendingPlaceCard, onPlaceCardPlaced, onPlaceCardCanceled }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef(new Map<string, Konva.Group>())

  // Transformer 드래그 시 아이템 동기화를 위한 ref
  const transformerDragStartPos = useRef<{ x: number; y: number } | null>(null)
  const itemStatesBeforeDrag = useRef<Map<string, DragInitialState>>(new Map())

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

  // 스페이스바를 누르고 있는지 여부 (일시적 hand 모드)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // 스페이스바가 눌려있으면 hand 모드, 아니면 현재 선택된 도구
  const effectiveTool = useMemo(() => (isSpacePressed ? 'hand' : activeTool), [isSpacePressed, activeTool])

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

  // Transformer 노드 연결 (선택 변경 시)
  useEffect(() => {
    if (!transformerRef.current) return

    // 선택된 모든 아이템을 Transformer에 연결
    const nodes = selectedItems.map(item => shapeRefs.current.get(item.id)).filter((node): node is Konva.Group => !!node)

    transformerRef.current.nodes(nodes)
  }, [selectedItems])

  // PostIt Transform 종료 핸들러
  const handlePostItTransformEnd = useCallback(
    (postIt: PostIt, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Group
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      // 스케일 리셋
      node.scaleX(1)
      node.scaleY(1)

      // 새 크기 계산
      const newWidth = postIt.width * scaleX
      const newHeight = postIt.height * scaleY

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

  // PlaceCard Transform 종료 핸들러
  const handlePlaceCardTransformEnd = useCallback(
    (card: PlaceCard, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Group
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()

      // 스케일 리셋
      node.scaleX(1)
      node.scaleY(1)

      const cardWidth = card.width ?? PLACE_CARD_WIDTH
      const cardHeight = card.height ?? PLACE_CARD_HEIGHT

      // 새 크기 계산
      const newWidth = cardWidth * scaleX
      const newHeight = cardHeight * scaleY

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

  // Transformer 드래그 시작 핸들러 (선택된 모든 아이템의 초기 상태 저장)
  const handleTransformerDragStart = useCallback(() => {
    // Transformer의 첫 번째 노드 위치를 시작점으로 저장
    const nodes = transformerRef.current?.nodes() || []
    if (nodes.length > 0) {
      transformerDragStartPos.current = { x: nodes[0].x(), y: nodes[0].y() }
    }

    // 선택된 아이템들의 현재 상태 저장
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

  // Transformer 드래그 종료 핸들러 (Yjs 한번에 업데이트)
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

    // ref 초기화
    transformerDragStartPos.current = null
    itemStatesBeforeDrag.current.clear()
  }, [selectedItems, updateLine, updatePostIt, updatePlaceCard])

  // 객체 선택 핸들러 (mouseDown에서 호출 - 즉시 선택 전환)
  // Shift/Ctrl/Cmd 키로 다중 선택 지원
  const handleObjectMouseDown = useCallback(
    (id: string, type: CanvasItemType, e: Konva.KonvaEventObject<MouseEvent>) => {
      // 장소 카드 배치 중에는 객체 선택/이벤트 차단
      if (pendingPlaceCard) return

      // Cursor 툴이 아니면 무시
      if (effectiveTool !== 'cursor') return

      // 이벤트 버블링 방지 (Stage mouseDown 방지)
      e.cancelBubble = true

      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
      const isAlreadySelected = selectedItems.some(item => item.id === id && item.type === type)

      if (!metaPressed && !isAlreadySelected) {
        // Meta 키 없이 선택되지 않은 요소 클릭 → 단일 선택
        setSelectedItems([{ id, type }])
      } else if (metaPressed && isAlreadySelected) {
        // Meta 키 + 이미 선택된 요소 클릭 → 선택에서 제거
        setSelectedItems(prev => prev.filter(item => !(item.id === id && item.type === type)))
      } else if (metaPressed && !isAlreadySelected) {
        // Meta 키 + 선택되지 않은 요소 클릭 → 선택에 추가
        setSelectedItems(prev => [...prev, { id, type }])
      }
      // 이미 선택된 요소를 Meta 키 없이 클릭 → 그대로 유지 (드래그 준비)
    },
    [effectiveTool, pendingPlaceCard, selectedItems],
  )

  // 객체 클릭 핸들러 (click/contextMenu에서 호출 - 우클릭 메뉴 처리)
  const handleObjectClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // 장소 카드 배치 중에는 객체 선택/이벤트 차단
      if (pendingPlaceCard) return

      // Cursor 툴이 아니면 무시
      if (effectiveTool !== 'cursor') return

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
    [effectiveTool, pendingPlaceCard],
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

  // 스페이스바 단축키로 일시적 hand 모드 전환
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 다른 입력 요소에 포커스가 있으면 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // 스페이스바 누르면 일시적 hand 모드
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // 스페이스바 떼면 원래 도구로 복귀
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
      if (effectiveTool === 'postIt' && !pendingPlaceCard) {
        setCursorPos(canvasPos)
      }

      if (pendingPlaceCard) {
        setPlaceCardCursorPos({ ...canvasPos, cardId: pendingPlaceCard.id })
      }

      // 드래그 선택 중이면 선택 영역 업데이트
      // 함수형 업데이트를 사용하여 stale closure 문제 방지
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

      // 펜 드로잉 중이면 포인트 추가
      if (effectiveTool === 'pencil' && isDrawing && currentLineId) {
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
    if (effectiveTool === 'postIt') {
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
    if (effectiveTool === 'cursor') {
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
    if (effectiveTool === 'hand') return

    // 포스트잇 추가 (커서를 중앙으로)
    if (effectiveTool === 'postIt') {
      stopCapturing()
      const newPostIt: PostIt = {
        id: `postIt-${crypto.randomUUID()}`,
        x: canvasPos.x - 75, // 중앙 정렬 (width / 2)
        y: canvasPos.y - 75, // 중앙 정렬 (height / 2)
        width: 150,
        height: 150,
        scale: 1,
        fill: '#FFF9C4', // 노란색 포스트잇
        text: '내용을 입력하세요',
        authorName: `User ${socketId.substring(0, 4)}`,
      }
      addPostIt(newPostIt)
    }

    // 펜 드로잉 시작
    if (effectiveTool === 'pencil') {
      stopCapturing()
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
    if (effectiveTool === 'pencil' && isDrawing) {
      setIsDrawing(false)
      setCurrentLineId(null)
      stopCapturing()
    }

    // 드래그 선택 종료 및 충돌 감지
    // 함수형 업데이트를 사용하여 최신 selectionBox 값으로 충돌 감지
    if (effectiveTool === 'cursor' && isSelecting) {
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

  /**
   * 도구에 따른 커서 스타일 반환
   * effectiveTool을 사용하여 스페이스바 누르고 있을 때 hand 커서 표시
   */
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
      effectiveTool === tool ? 'text-primary' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900',
    )
  }

  const getActionButtonStyle = (isEnabled: boolean) => {
    return cn(
      'p-2.5 rounded-full transition-all duration-200 text-gray-400 hover:bg-gray-100 hover:text-gray-900',
      !isEnabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-gray-400',
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

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button type="button" onClick={undo} disabled={!canUndo} className={getActionButtonStyle(canUndo)} title="Undo" aria-label="Undo">
            <UndoIcon className="w-5 h-5" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} className={getActionButtonStyle(canRedo)} title="Redo" aria-label="Redo">
            <RedoIcon className="w-5 h-5" />
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
        // 손 도구일 때 또는 스페이스바 누르고 있을 때 캔버스 전체 드래그(Pan) 가능
        draggable={!pendingPlaceCard && effectiveTool === 'hand'}
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
                  // 단일 드래그
                  const node = e.target
                  const dx = node.x() - box.x
                  const dy = node.y() - box.y
                  const newPoints = line.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy))
                  updateLine(line.id, { points: newPoints })
                }}
                onTransformEnd={e => {
                  // 리사이즈
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
                {/* 그룹의 히트박스 역할을 하는 투명한 Rect */}
                <Rect width={box.width} height={box.height} fill="transparent" />
                <Line
                  points={line.points.map((p, i) => (i % 2 === 0 ? p - box.x : p - box.y))}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={line.tension}
                  lineCap={line.lineCap}
                  lineJoin={line.lineJoin}
                  globalCompositeOperation={line.tool === 'pen' ? 'source-over' : 'destination-out'}
                  listening={false} // 그룹이 이벤트를 받으므로 line은 listening false
                  width={box.width}
                  height={box.height}
                />
              </Group>
            )
          })}

          {/* 포스트잇 렌더링 */}
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

          {/* 장소 카드 렌더링 */}
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

          {/* 고스트 포스트잇 (미리보기) */}
          {effectiveTool === 'postIt' && !pendingPlaceCard && cursorPos && (
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

          {/* Transformer (선택된 요소에 크기 조절/회전 핸들 표시) */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            flipEnabled={false}
            onDragStart={handleTransformerDragStart}
            onDragEnd={handleTransformerDragEnd}
          />

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
