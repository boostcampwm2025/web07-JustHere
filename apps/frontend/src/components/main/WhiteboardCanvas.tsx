import { HandBackRightIcon, NoteTextIcon, PencilIcon } from '@/components/Icons'
import { useEffect, useState } from 'react'
import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import { useWhiteboardStore } from '@/stores/whiteboardStore'
import { cn } from '@/utils/cn' // cn 유틸리티가 없다면 클래스 문자열 결합으로 대체 가능

type ToolType = 'hand' | 'pencil' | 'postit'

interface WhiteboardCanvasProps {
  roomId: string
  categoryId: string
}

export default function WhiteboardCanvas({ roomId, categoryId }: WhiteboardCanvasProps) {
  const { connect, disconnect, shapes, addRect, updateShapePosition } = useWhiteboardStore()

  // 현재 선택된 도구 상태
  const [activeTool, setActiveTool] = useState<ToolType>('hand')

  // 포스트잇 Ghost UI 용 마우스 커서 위치 상태
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // useEffect(() => {
  //   connect(roomId, categoryId)
  //   return () => disconnect()
  // }, [roomId, categoryId, connect, disconnect])

  /**
   * 도구에 따른 커서 스타일 반환
   */
  const getCursorStyle = () => {
    switch (activeTool) {
      case 'hand':
        return 'cursor-grab active:cursor-grabbing'
      case 'pencil':
        return 'cursor-crosshair' // 십자 커서
      case 'postit':
        return 'cursor-pointer' // 포인터 커서
      default:
        return 'cursor-default'
    }
  }

  /**
   * 마우스 이동 핸들러
   * 포스트잇 모드일 때만 좌표를 업데이트하여 리렌더링 최적화
   */
  const handleMouseMove = (e: any) => {
    if (activeTool !== 'postit') return

    const stage = e.target.getStage()
    // 줌/팬이 적용된 정확한 상대 좌표 계산
    const pos = stage.getRelativePointerPosition()
    setCursorPos(pos)
  }

  /**
   * 마우스가 캔버스를 벗어났을 때 고스트 숨김
   */
  const handleMouseLeave = () => {
    if (activeTool === 'postit') {
      setCursorPos(null)
    }
  }

  /**
   * 캔버스 클릭 핸들러 (포스트잇 모드일 때 추가 로직)
   */
  const handleStageClick = (e: any) => {
    // 1. 포스트잇 도구가 아니면 무시
    if (activeTool !== 'postit') return

    // 2. 스테이지(빈 공간)를 클릭했는지 확인 (이미 있는 도형 클릭 시 생성 방지)
    const stage = e.target.getStage()
    const isClickedOnEmptyStage = e.target === stage

    if (isClickedOnEmptyStage) {
      // 3. 중요: 현재 뷰포트(화면) 기준이 아닌, '스테이지 내부 좌표계' 기준 좌표를 가져옴
      // 현재 캔버스의 이동(Offset)과 확대/축소(Scale) 상태를 모두 고려한 좌표를 반환함.
      const pos = stage.getRelativePointerPosition()

      if (pos) {
        // 4. 클릭한 지점이 포스트잇의 정중앙이 되도록 좌표 보정 (100x100 크기 가정 시 -50)
        addRect(pos.x - 50, pos.y - 50)

        // 5. 생성 후 손 도구로 복귀
        setActiveTool('hand')

        // 생성 후 고스트 UI 제거
        setCursorPos(null)
      }
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

          <button onClick={() => setActiveTool('postit')} className={getButtonStyle('postit')} title="포스트잇 추가">
            <NoteTextIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 디버깅용 정보 (좌측 상단) -> 추후 삭제하기 */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/80 backdrop-blur rounded-lg shadow-sm text-xs text-gray-500">
        {roomId} / {categoryId}
      </div>

      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        // 손 도구일 때만 캔버스 전체 드래그(Pan) 가능
        draggable={activeTool === 'hand'}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove} // 마우스 이동 감지
        onMouseLeave={handleMouseLeave} // 마우스 이탈 감지
      >
        <Layer>
          {shapes.map(shape => (
            <Rect
              key={shape.id}
              x={shape.x}
              y={shape.y}
              width={100}
              height={100}
              fill={shape.color}
              shadowBlur={5}
              cornerRadius={8}
              // 손 도구일 때만 개별 객체 드래그 가능하도록 제어 (선택 사항)
              draggable={activeTool === 'hand'}
              onDragEnd={e => {
                updateShapePosition(shape.id, e.target.x(), e.target.y())
              }}
            />
          ))}

          {/* ✨ 2. 고스트 포스트잇 (미리보기) */}
          {activeTool === 'postit' && cursorPos && (
            <Group
              x={cursorPos.x - 50} // 마우스 중앙 정렬
              y={cursorPos.y - 50}
              listening={false} // ✨ 중요: 클릭 이벤트를 가로채지 않도록 설정 (클릭 통과)
            >
              <Rect
                width={100}
                height={100}
                fill="#FFF9C4" // 기본 노란색
                opacity={0.6} // 반투명 효과
                cornerRadius={8}
                stroke="#9CA3AF" // 회색 테두리
                strokeWidth={2}
                dash={[5, 5]} // 점선 효과로 '임시'임을 강조
              />
              <Text x={0} y={40} width={100} text="Click to add" align="center" fill="#6B7280" fontSize={12} />
            </Group>
          )}

          {shapes.length === 0 && (
            <Text text="도구를 선택해 보세요!" x={window.innerWidth / 2 - 100} y={window.innerHeight / 2} fontSize={20} fill="gray" />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
