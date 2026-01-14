import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Circle, Text, Rect } from 'react-konva'
import type Konva from 'konva'
import { useYjsSocket } from '@/hooks/useYjsSocket'
import type { Tool, Rectangle } from '@/types/canvas.types'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
}

function WhiteboardCanvas({ roomId, canvasId }: WhiteboardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [tool, setTool] = useState<Tool>('cursor')
  const [scale, setScale] = useState(1)

  const { isConnected, cursors, rectangles, updateCursor, addRectangle, updateRectangle } = useYjsSocket({
    roomId,
    canvasId,
  })

  // 컨테이너 크기에 맞춰 Stage 크기 조정
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 마우스 이동 시 커서 위치 업데이트
  const handleMouseMove = () => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (pos) {
      updateCursor(pos.x, pos.y)
    }
  }

  // 마우스 다운 이벤트
  const handleMouseDown = () => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    if (tool === 'rectangle') {
      // 네모 추가
      const newRect: Rectangle = {
        id: `rect-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        width: 100,
        height: 100,
        fill: '#3b82f6',
      }
      addRectangle(newRect)
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
    setScale(clampedScale)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? '연결됨' : '연결 안 됨'}</span>
          </div>
          <span className="text-sm">참여자: {cursors.size + 1}명</span>

          {/* 도구 메뉴 */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setTool('cursor')}
              className={`px-4 py-2 rounded ${tool === 'cursor' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              커서
            </button>
            <button
              onClick={() => setTool('rectangle')}
              className={`px-4 py-2 rounded ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              네모
            </button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative">
        {/* 확대/축소 컨트롤 */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <div className="px-4 py-2 bg-white border border-gray-300 rounded shadow-md text-sm text-center">{Math.round(scale * 100)}%</div>
        </div>

        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          onTouchMove={handleMouseMove}
          onTouchStart={handleMouseDown}
          className={tool === 'pen' ? 'cursor-crosshair' : 'cursor-default'}
        >
          <Layer>
            {/* 네모 렌더링 */}
            {rectangles.map(rect => (
              <Rect
                key={rect.id}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={rect.fill}
                draggable={tool === 'cursor'}
                onDragEnd={e => {
                  updateRectangle(rect.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  })
                }}
              />
            ))}

            {/* 다른 사용자의 커서 렌더링 */}
            {Array.from(cursors.values()).map(cursor => (
              <React.Fragment key={cursor.socketId}>
                {/* 커서 원 */}
                <Circle x={cursor.x} y={cursor.y} radius={8} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
                {/* 사용자 ID 텍스트 */}
                <Text x={cursor.x + 12} y={cursor.y - 8} text={`User ${cursor.socketId.substring(0, 4)}`} fontSize={12} fill="#3b82f6" />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

export default WhiteboardCanvas
