import { useRef, useEffect } from 'react'
import { useYjsSocket } from '@/hooks/useYjsSocket'

interface WhiteboardCanvasProps {
  roomId: string
  canvasId: string
}

function WhiteboardCanvas({ roomId, canvasId }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isConnected, cursors, updateCursor } = useYjsSocket({
    roomId,
    canvasId,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 크기 설정
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 마우스 이동 이벤트
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      updateCursor(x, y)
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [updateCursor])

  // 커서 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const renderCursors = () => {
      // 캔버스 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 다른 사용자의 커서 그리기
      cursors.forEach(cursor => {
        ctx.beginPath()
        ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#3b82f6'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()

        // 커서 소유자 표시
        ctx.fillStyle = '#3b82f6'
        ctx.font = '12px sans-serif'
        ctx.fillText(`User ${cursor.socketId.substring(0, 4)}`, cursor.x + 12, cursor.y - 8)
      })

      requestAnimationFrame(renderCursors)
    }

    const animationId = requestAnimationFrame(renderCursors)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [cursors])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? '연결됨' : '연결 안 됨'}</span>
          </div>
          <span className="text-sm">참여자: {cursors.size + 1}명</span>
        </div>
      </div>
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" style={{ touchAction: 'none' }} />
      </div>
    </div>
  )
}

export default WhiteboardCanvas
