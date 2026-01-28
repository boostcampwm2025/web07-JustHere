import { useState, useCallback } from 'react'
import { addSocketBreadcrumb } from '@/shared/utils'
import type { Line as LineType } from '@/shared/types'

interface UseCanvasDrawProps {
  lines: LineType[]
  addLine: (line: LineType) => void
  updateLine: (id: string, updates: Partial<LineType>) => void
  stopCapturing: () => void
  roomId: string
  canvasId: string
}

export const useCanvasDraw = ({ lines, addLine, updateLine, stopCapturing, roomId, canvasId }: UseCanvasDrawProps) => {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLineId, setCurrentLineId] = useState<string | null>(null)

  const cancelDrawing = useCallback(
    (reason: 'tool-change' | 'mouse-leave' | 'space-press') => {
      if (!isDrawing) return
      addSocketBreadcrumb('draw:cancel', { roomId, canvasId, lineId: currentLineId ?? undefined, reason })
      setIsDrawing(false)
      setCurrentLineId(null)
      stopCapturing()
    },
    [isDrawing, currentLineId, roomId, canvasId, stopCapturing],
  )

  const startDrawing = useCallback(
    (canvasPos: { x: number; y: number }) => {
      stopCapturing()
      setIsDrawing(true)
      const newLineId = `line-${crypto.randomUUID()}`
      setCurrentLineId(newLineId)

      const newLine: LineType = {
        id: newLineId,
        points: [canvasPos.x, canvasPos.y],
        stroke: '#000000',
        strokeWidth: 2,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        tool: 'pen',
      }
      addLine(newLine)
      addSocketBreadcrumb('draw:start', { roomId, canvasId, lineId: newLineId })
    },
    [addLine, canvasId, roomId, stopCapturing],
  )

  const continueDrawing = useCallback(
    (canvasPos: { x: number; y: number }) => {
      if (!isDrawing || !currentLineId) return

      const currentLine = lines.find(line => line.id === currentLineId)
      if (currentLine) {
        const newPoints = [...currentLine.points, canvasPos.x, canvasPos.y]
        updateLine(currentLineId, { points: newPoints })
      }
    },
    [isDrawing, currentLineId, lines, updateLine],
  )

  const endDrawing = useCallback(() => {
    if (!isDrawing) return

    if (currentLineId) {
      addSocketBreadcrumb('draw:end', { roomId, canvasId, lineId: currentLineId })
    }
    setIsDrawing(false)
    setCurrentLineId(null)
    stopCapturing()
  }, [isDrawing, currentLineId, roomId, canvasId, stopCapturing])

  return {
    isDrawing,
    cancelDrawing,
    startDrawing,
    continueDrawing,
    endDrawing,
  }
}
