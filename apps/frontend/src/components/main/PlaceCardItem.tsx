import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
import { useImage } from 'react-konva-utils'
import type { PlaceCard } from '@/types/canvas.types'

interface PlaceCardItemProps {
  card: PlaceCard
  draggable: boolean
  onDragEnd: (x: number, y: number) => void
  onRemove: () => void
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onContextMenu?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  shapeRef?: (node: Konva.Group | null) => void
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void
}

// 기준 상수값 (scale이 1일 때의 기준)
const DEFAULT_CARD_WIDTH = 240
const DEFAULT_CARD_HEIGHT = 180
const BASE_IMAGE_HEIGHT = 90
const BASE_PADDING = 12
const PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

function PlaceCardItem({ card, draggable, onDragEnd, onRemove, onMouseDown, onClick, onContextMenu, shapeRef, onTransformEnd }: PlaceCardItemProps) {
  const groupRef = useRef<Konva.Group>(null)

  // 현재 스케일
  const scale = card.scale || 1

  // 1. 전체 카드 크기 조절
  const cardWidth = card.width ?? DEFAULT_CARD_WIDTH
  const cardHeight = card.height ?? DEFAULT_CARD_HEIGHT

  // 2. 내부 요소들을 위한 스케일된 간격/크기 계산
  const scaledPadding = BASE_PADDING * scale
  const scaledImageHeight = BASE_IMAGE_HEIGHT * scale
  const textWidth = Math.max(1, cardWidth - scaledPadding * 2)

  // shapeRef 콜백 연결
  useEffect(() => {
    if (shapeRef) {
      shapeRef(groupRef.current)
    }
  }, [shapeRef])

  const [image] = useImage(card.image || PLACEHOLDER_SRC, 'anonymous')

  return (
    <Group
      ref={groupRef}
      x={card.x}
      y={card.y}
      width={cardWidth}
      height={cardHeight}
      draggable={draggable}
      onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTransformEnd={onTransformEnd}
    >
      {/* 배경 카드 */}
      <Rect
        width={cardWidth}
        height={cardHeight}
        fill="#FFFBE6"
        stroke="#E5E7EB"
        strokeWidth={1 * scale}
        cornerRadius={10 * scale} // 코너 반경도 스케일에 맞게
      />

      {/* 이미지 영역 */}
      {image && card.image ? (
        <KonvaImage image={image} x={scaledPadding} y={scaledPadding} width={textWidth} height={scaledImageHeight} cornerRadius={8 * scale} />
      ) : (
        <Rect x={scaledPadding} y={scaledPadding} width={textWidth} height={scaledImageHeight} fill="#F3F4F6" cornerRadius={8 * scale} />
      )}

      {/* 텍스트 정보 (y값과 fontSize에 스케일 적용) */}
      <Text
        text={card.name}
        x={scaledPadding}
        y={scaledPadding + scaledImageHeight + 10 * scale}
        width={textWidth}
        fontSize={14 * scale}
        fontStyle="bold"
        fill="#111827"
        ellipsis={true} // 텍스트가 넘칠 경우 처리
        wrap="none"
      />

      <Text
        text={card.category || ''}
        x={scaledPadding}
        y={scaledPadding + scaledImageHeight + 30 * scale}
        width={textWidth}
        fontSize={11 * scale}
        fill="#6B7280"
      />

      <Text
        text={card.address}
        x={scaledPadding}
        y={scaledPadding + scaledImageHeight + 49 * scale}
        width={textWidth}
        fontSize={12 * scale}
        fill="#4B5563"
        wrap="char" // 주소는 길어질 수 있으므로 줄바꿈 허용
      />

      {/* 삭제 버튼 (크기와 위치 모두 스케일링) */}
      <Group
        x={cardWidth - 24 * scale}
        y={8 * scale}
        onClick={e => {
          e.cancelBubble = true
          onRemove()
        }}
        onTap={e => {
          e.cancelBubble = true
          onRemove()
        }}
      >
        <Rect width={16 * scale} height={16 * scale} fill="#F3F4F6" stroke="#E5E7EB" strokeWidth={1 * scale} cornerRadius={8 * scale} />
        <Text text="×" width={16 * scale} height={16 * scale} align="center" verticalAlign="middle" fontSize={14 * scale} fill="#4B5563" />
      </Group>
    </Group>
  )
}

export default PlaceCardItem
