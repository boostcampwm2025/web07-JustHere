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

const DEFAULT_CARD_WIDTH = 240
const DEFAULT_CARD_HEIGHT = 180
const IMAGE_HEIGHT = 90
const PADDING = 12
const PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

function PlaceCardItem({ card, draggable, onDragEnd, onRemove, onMouseDown, onClick, onContextMenu, shapeRef, onTransformEnd }: PlaceCardItemProps) {
  const groupRef = useRef<Konva.Group>(null)

  // 카드 크기 (기본값 사용)
  const cardWidth = card.width ?? DEFAULT_CARD_WIDTH
  const cardHeight = card.height ?? DEFAULT_CARD_HEIGHT

  // 이미지 높이 비율 계산 (기본 높이 기준으로 비율 유지)
  const imageHeight = (IMAGE_HEIGHT / DEFAULT_CARD_HEIGHT) * cardHeight
  const padding = (PADDING / DEFAULT_CARD_WIDTH) * cardWidth

  // shapeRef 콜백 연결
  useEffect(() => {
    if (shapeRef) {
      shapeRef(groupRef.current)
    }
  }, [shapeRef])

  // konva를 쓰면 src로 이미지 받아서 렌더링하는게 안됨, 이미 로드된 이미지만 렌더링할 수 있다.
  const [image] = useImage(card.image || PLACEHOLDER_SRC, 'anonymous')

  return (
    <Group
      ref={groupRef}
      x={card.x}
      y={card.y}
      width={cardWidth}
      height={cardHeight}
      rotation={card.rotation ?? 0}
      draggable={draggable}
      onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTransformEnd={onTransformEnd}
    >
      <Rect width={cardWidth} height={cardHeight} fill="#FFFBE6" stroke="#E5E7EB" strokeWidth={1} cornerRadius={10} />

      {image && card.image ? (
        <KonvaImage image={image} x={padding} y={padding} width={cardWidth - padding * 2} height={imageHeight} />
      ) : (
        <Rect x={padding} y={padding} width={cardWidth - padding * 2} height={imageHeight} fill="#F3F4F6" cornerRadius={8} />
      )}

      <Text
        text={card.name}
        x={padding}
        y={padding + imageHeight + 10}
        width={cardWidth - padding * 2}
        fontSize={14}
        fontStyle="bold"
        fill="#111827"
      />

      <Text text={card.category || ''} x={padding} y={padding + imageHeight + 30} width={cardWidth - padding * 2} fontSize={11} fill="#6B7280" />

      <Text text={card.address} x={padding} y={padding + imageHeight + 49} width={cardWidth - padding * 2} fontSize={12} fill="#4B5563" />

      <Group
        x={cardWidth - 24}
        y={8}
        onClick={e => {
          e.cancelBubble = true
          onRemove()
        }}
        onTap={e => {
          e.cancelBubble = true
          onRemove()
        }}
      >
        <Rect width={16} height={16} fill="#F3F4F6" stroke="#E5E7EB" cornerRadius={8} />
        <Text text="×" width={16} height={16} align="center" verticalAlign="middle" fontSize={14} fill="#4B5563" />
      </Group>
    </Group>
  )
}

export default PlaceCardItem
