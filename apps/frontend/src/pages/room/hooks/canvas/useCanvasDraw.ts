import { useRef, useCallback, useEffect } from 'react'
import type Konva from 'konva'
import { addSocketBreadcrumb } from '@/shared/utils'
import { throttle } from '@/shared/utils/throttle'
import type { Line as LineType } from '@/shared/types'
import { DEFAULT_LINE } from '../../constants'

interface UseCanvasDrawProps {
  addLine: (line: LineType) => void
  updateLine: (id: string, updates: Partial<LineType>) => void
  stopCapturing: () => void
  roomId: string
  canvasId: string
}

export const useCanvasDraw = ({ addLine, updateLine, stopCapturing, roomId, canvasId }: UseCanvasDrawProps) => {
  const isDrawingRef = useRef(false)
  const currentLineIdRef = useRef<string | null>(null)
  const currentLineNodeRef = useRef<Konva.Line | null>(null)
  const localPointsRef = useRef<number[]>([])
  const layerRef = useRef<Konva.Layer | null>(null)

  const addLineRef = useRef(addLine)
  const updateLineRef = useRef(updateLine)
  const stopCapturingRef = useRef(stopCapturing)

  useEffect(() => {
    addLineRef.current = addLine
    updateLineRef.current = updateLine
    stopCapturingRef.current = stopCapturing
  }, [addLine, updateLine, stopCapturing])

  const throttledUpdateLineRef = useRef<((id: string, points: number[]) => void) | null>(null)

  useEffect(() => {
    if (throttledUpdateLineRef.current === null) {
      throttledUpdateLineRef.current = throttle((id: string, points: number[]) => {
        updateLineRef.current(id, { points: [...points] })
      }, 100)
    }
  }, [])

  // 드로잉 완료 시 currentDrawingLine을 초기화하는 내부 함수
  const clearDrawingLineNode = useCallback(() => {
    if (currentLineNodeRef.current) {
      currentLineNodeRef.current.points([])
      if (layerRef.current) {
        layerRef.current.batchDraw()
      }
    }
  }, [])

  const cancelDrawing = useCallback(
    (reason: 'tool-change' | 'mouse-leave' | 'space-press') => {
      if (!isDrawingRef.current) return

      addSocketBreadcrumb('draw:cancel', { roomId, canvasId, lineId: currentLineIdRef.current ?? undefined, reason })

      // 취소 시 현재까지의 라인을 저장
      if (currentLineIdRef.current && localPointsRef.current.length > 0) {
        updateLineRef.current(currentLineIdRef.current, { points: [...localPointsRef.current] })
      }

      // currentDrawingLine 초기화 (잔상 제거)
      clearDrawingLineNode()

      isDrawingRef.current = false
      currentLineIdRef.current = null
      currentLineNodeRef.current = null
      localPointsRef.current = []
      layerRef.current = null
      stopCapturingRef.current()
    },
    [roomId, canvasId, clearDrawingLineNode],
  )

  const startDrawing = useCallback(
    (canvasPos: { x: number; y: number }, lineNode: Konva.Line, layer: Konva.Layer) => {
      stopCapturingRef.current()

      const newLineId = `line-${crypto.randomUUID()}`

      isDrawingRef.current = true
      currentLineIdRef.current = newLineId
      currentLineNodeRef.current = lineNode
      localPointsRef.current = [canvasPos.x, canvasPos.y]
      layerRef.current = layer

      lineNode.points([canvasPos.x, canvasPos.y])
      layer.batchDraw()

      // 네트워크에 초기 라인 추가
      const newLine: LineType = {
        id: newLineId,
        points: [canvasPos.x, canvasPos.y],
        stroke: DEFAULT_LINE.stroke,
        strokeWidth: DEFAULT_LINE.strokeWidth,
        tension: DEFAULT_LINE.tension,
        lineCap: DEFAULT_LINE.lineCap,
        lineJoin: DEFAULT_LINE.lineJoin,
        tool: DEFAULT_LINE.tool,
      }
      addLineRef.current(newLine)
      addSocketBreadcrumb('draw:start', { roomId, canvasId, lineId: newLineId })
    },
    [roomId, canvasId],
  )

  const continueDrawing = useCallback((canvasPos: { x: number; y: number }) => {
    if (!isDrawingRef.current || !currentLineNodeRef.current || !currentLineIdRef.current) return

    localPointsRef.current.push(canvasPos.x, canvasPos.y)

    currentLineNodeRef.current.points(localPointsRef.current)

    if (layerRef.current) {
      layerRef.current.batchDraw()
    }

    throttledUpdateLineRef.current?.(currentLineIdRef.current, localPointsRef.current)
  }, [])

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current) return

    const lineId = currentLineIdRef.current
    const finalPoints = [...localPointsRef.current]

    clearDrawingLineNode()

    if (lineId && finalPoints.length > 0) {
      updateLineRef.current(lineId, { points: finalPoints })
      addSocketBreadcrumb('draw:end', { roomId, canvasId, lineId })
    }

    isDrawingRef.current = false
    currentLineIdRef.current = null
    currentLineNodeRef.current = null
    localPointsRef.current = []
    layerRef.current = null
    stopCapturingRef.current()
  }, [roomId, canvasId, clearDrawingLineNode])

  const getIsDrawing = useCallback(() => isDrawingRef.current, [])
  const getCurrentLineId = useCallback(() => currentLineIdRef.current, [])

  return {
    getIsDrawing,
    getCurrentLineId,
    cancelDrawing,
    startDrawing,
    continueDrawing,
    endDrawing,
  }
}
