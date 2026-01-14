import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Circle, Text, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { Tool, Rectangle } from '@/types/canvas.types'
import { cn } from '@/utils/cn'
import { HandBackRightIcon, NoteTextIcon, PencilIcon } from '@/components/Icons'

type ToolType = 'hand' | 'pencil' | 'postit'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
}

function WhiteboardCanvas({ roomId, canvasId }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  // 현재 선택된 도구 상태
  const [activeTool, setActiveTool] = useState<ToolType>('hand')
  const [scale, setScale] = useState(1)

  const { isConnected, cursors, rectangles, updateCursor, addRectangle, updateRectangle } = useYjsSocket({
    roomId,
    canvasId,
  })

  // 컨테이너 크기에 맞춰 Stage 크기 조정

  // 마우스 이동 시 커서 위치 업데이트

  // 마우스 다운 이벤트

  // 휠 이벤트로 확대/축소 (Cmd/Ctrl + Scroll)

  // 포스트잇 Ghost UI 용 마우스 커서 위치 상태
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

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

      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        // 손 도구일 때만 캔버스 전체 드래그(Pan) 가능
        draggable={activeTool === 'hand'}
        // onClick={handleStageClick}
        // onMouseMove={handleMouseMove} // 마우스 이동 감지
        // onMouseLeave={handleMouseLeave} // 마우스 이탈 감지
      >
        <Layer>
          {rectangles.map(shape => (
            <Rect
              key={shape.id}
              x={shape.x}
              y={shape.y}
              width={100}
              height={100}
              shadowBlur={5}
              cornerRadius={8}
              // 손 도구일 때만 개별 객체 드래그 가능하도록 제어 (선택 사항)
              draggable={activeTool === 'hand'}
              // onDragEnd={e => {
              //   updateShapePosition(shape.id, e.target.x(), e.target.y())
              // }}
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

          {/* {shapes.length === 0 && (
            <Text text="도구를 선택해 보세요!" x={window.innerWidth / 2 - 100} y={window.innerHeight / 2} fontSize={20} fill="gray" />
          )} */}
        </Layer>
      </Stage>
    </div>
  )
}

export default WhiteboardCanvas
