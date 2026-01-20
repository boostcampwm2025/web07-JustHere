import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
import { useImage } from 'react-konva-utils'
import type { PlaceCard } from '@/types/canvas.types'

interface PlaceCardItemProps {
  card: PlaceCard
  draggable: boolean
  onDragEnd: (x: number, y: number) => void
  onRemove: () => void
}

const CARD_WIDTH = 240
const CARD_HEIGHT = 180
const IMAGE_HEIGHT = 90
const PADDING = 12

function PlaceCardItem({ card, draggable, onDragEnd, onRemove }: PlaceCardItemProps) {
  // konva를 쓰면 src로 이미지 받아서 렌더링하는게 안됨, 이미 로드된 이미지만 렌더링할 수 있다.
  // 원래 img 태그 쓰면 브라우저가 HTML 렌더링 엔진에서 자동으로 이미지 다운, 캐싱, 로딩 에러 처리 해줌, React는 문자열만 전달
  // konva는 canvas 기반이니까 브라우저의 이미지 로딩 시스템을 쓸 수 없음.
  // 그래서 URL -> Image 객체 변환이 필요함. 그 도구로 useImage를 쓰는 것.
  const [image] = useImage(card.image ?? '', 'anonymous')

  return (
    <Group x={card.x} y={card.y} draggable={draggable} onDragEnd={e => onDragEnd(e.target.x(), e.target.y())}>
      <Rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#FFFBE6" stroke="#E5E7EB" cornerRadius={10} />

      {image ? (
        <KonvaImage image={image} x={PADDING} y={PADDING} width={CARD_WIDTH - PADDING * 2} height={IMAGE_HEIGHT} />
      ) : (
        <Rect x={PADDING} y={PADDING} width={CARD_WIDTH - PADDING * 2} height={IMAGE_HEIGHT} fill="#F3F4F6" cornerRadius={8} />
      )}

      <Text
        text={card.name}
        x={PADDING}
        y={PADDING + IMAGE_HEIGHT + 10}
        width={CARD_WIDTH - PADDING * 2}
        fontSize={14}
        fontStyle="bold"
        fill="#111827"
      />

      <Text text={card.address} x={PADDING} y={PADDING + IMAGE_HEIGHT + 32} width={CARD_WIDTH - PADDING * 2} fontSize={12} fill="#4B5563" />

      <Group
        x={CARD_WIDTH - 24}
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
