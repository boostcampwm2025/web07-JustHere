import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
import { useImage } from 'react-konva-utils'
import type { PlaceCard } from '@/shared/types'
import { PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { getImageCrop } from '@/pages/room/utils'

interface PlaceCardItemProps {
  card: PlaceCard
  draggable: boolean
  onDragEnd: (x: number, y: number) => void
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onContextMenu?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  shapeRef?: (node: Konva.Group | null) => void
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void
}

const PLACE_CARD_PADDING = 12
const PLACE_CARD_IMAGE_HEIGHT = 100
const PLACE_CARD_PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
const ROUNDED_RADIUS = 10

export const PlaceCardItem = ({ card, draggable, onDragEnd, onMouseDown, onClick, onContextMenu, shapeRef, onTransformEnd }: PlaceCardItemProps) => {
  const groupRef = useRef<Konva.Group>(null)

  const scale = card.scale || 1

  const cardWidth = card.width ?? PLACE_CARD_WIDTH
  const cardHeight = card.height ?? PLACE_CARD_HEIGHT

  const scaledPadding = PLACE_CARD_PADDING * scale
  const scaledImageHeight = PLACE_CARD_IMAGE_HEIGHT * scale
  const textWidth = Math.max(1, cardWidth - scaledPadding * 2)

  useEffect(() => {
    if (shapeRef) {
      shapeRef(groupRef.current)
    }
  }, [shapeRef])

  const [image] = useImage(card.image || PLACE_CARD_PLACEHOLDER_IMAGE, 'anonymous')

  const imageWidth = textWidth + scaledPadding * 2
  const imageHeight = scaledImageHeight

  const imageCrop = image && card.image ? getImageCrop(image, { width: imageWidth, height: imageHeight }) : null

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
        fill="#FFFFFF"
        stroke="#E5E7EB"
        strokeWidth={1 * scale}
        cornerRadius={ROUNDED_RADIUS * scale}
        shadowBlur={15}
        shadowOffsetY={4}
        shadowOpacity={0.1}
      />

      {/* 이미지 */}
      {image && card.image ? (
        <KonvaImage
          image={image}
          width={imageWidth}
          height={imageHeight}
          cornerRadius={[ROUNDED_RADIUS * scale, ROUNDED_RADIUS * scale]}
          {...imageCrop}
        />
      ) : (
        <Rect width={imageWidth} height={imageHeight} fill="#F3F4F6" cornerRadius={[ROUNDED_RADIUS * scale, ROUNDED_RADIUS * scale]} />
      )}

      {/* 장소명 */}
      <Text
        text={card.name}
        x={scaledPadding}
        y={scaledImageHeight + 10 * scale}
        width={textWidth}
        fontSize={14 * scale}
        fontStyle="bold"
        fill="#111827"
        ellipsis={true}
        wrap="none"
      />

      {/* 카테고리 */}
      <Text text={card.category || ''} x={scaledPadding} y={scaledImageHeight + 30 * scale} width={textWidth} fontSize={11 * scale} fill="#6B7280" />

      {/* 주소 */}
      <Text
        text={card.address}
        x={scaledPadding}
        y={scaledImageHeight + 49 * scale}
        width={textWidth}
        fontSize={12 * scale}
        fill="#4B5563"
        wrap="char"
      />
    </Group>
  )
}
