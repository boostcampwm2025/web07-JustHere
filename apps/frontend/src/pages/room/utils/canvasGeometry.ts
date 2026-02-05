import type { BoundingBox, SelectionBox } from '@/shared/types'

// 드로잉 객체의 Bounding Box 계산 함수
export const getLineBoundingBox = (points: number[] | null | undefined): BoundingBox => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const xs = points.filter((_, i) => i % 2 === 0)
  const ys = points.filter((_, i) => i % 2 === 1)
  if (xs.length === 0 || ys.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

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

// 객체 충돌 감지 계산 함수 (드래그 시 활용)
export const isBoxIntersecting = (selectionBox: SelectionBox, boundingBox: BoundingBox): boolean => {
  const selMinX = Math.min(selectionBox.startX, selectionBox.endX)
  const selMaxX = Math.max(selectionBox.startX, selectionBox.endX)
  const selMinY = Math.min(selectionBox.startY, selectionBox.endY)
  const selMaxY = Math.max(selectionBox.startY, selectionBox.endY)

  const boxMinX = boundingBox.x
  const boxMaxX = boundingBox.x + boundingBox.width
  const boxMinY = boundingBox.y
  const boxMaxY = boundingBox.y + boundingBox.height

  return selMinX <= boxMaxX && selMaxX >= boxMinX && selMinY <= boxMaxY && selMaxY >= boxMinY
}
