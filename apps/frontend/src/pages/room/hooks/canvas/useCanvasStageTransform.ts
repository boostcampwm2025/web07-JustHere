import { useEffect, useCallback } from 'react'
import type Konva from 'konva'

interface UseCanvasStageTransformProps {
  stageRef: React.RefObject<Konva.Stage | null>
  canvasTransformRef?: React.MutableRefObject<{ x: number; y: number; scale: number }>
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void
}

export const useCanvasStageTransform = ({ stageRef, canvasTransformRef, onWheel }: UseCanvasStageTransformProps) => {
  // 현재 스테이지 상태를 Ref에 동기화
  const syncTransform = useCallback(() => {
    if (stageRef.current && canvasTransformRef) {
      canvasTransformRef.current = {
        x: stageRef.current.x(),
        y: stageRef.current.y(),
        scale: stageRef.current.scaleX(),
      }
    }
  }, [stageRef, canvasTransformRef])

  // 1. 초기 마운트 시 저장된 위치/줌 복원
  useEffect(() => {
    if (stageRef.current && canvasTransformRef) {
      const { x, y, scale } = canvasTransformRef.current
      stageRef.current.position({ x, y })
      stageRef.current.scale({ x: scale, y: scale })
      stageRef.current.batchDraw()
    }
  }, [stageRef, canvasTransformRef])

  // 2. 드래그 종료 시 위치 저장
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // 스테이지 자체를 드래그한 경우에만 저장 (내부 객체 드래그 제외)
      if (e.target === stageRef.current) {
        syncTransform()
      }
    },
    [stageRef, syncTransform],
  )

  // 3. 휠 줌 시 줌 로직 실행 후 상태 저장
  const handleWheelZoom = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      // 기존 줌 로직 실행 (useCanvasMouse에서 전달받은 함수)
      onWheel(e)
      // 변경된 상태 저장
      syncTransform()
    },
    [onWheel, syncTransform],
  )

  return {
    handleDragEnd,
    handleWheelZoom,
  }
}
