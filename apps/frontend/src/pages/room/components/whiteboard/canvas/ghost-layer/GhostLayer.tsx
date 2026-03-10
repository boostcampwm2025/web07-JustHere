import { DEFAULT_POST_IT_COLOR, PLACE_CARD_HEIGHT, PLACE_CARD_WIDTH } from '@/pages/room/constants'
import { memo } from 'react'
import { Group, Layer, Rect, Text } from 'react-konva'
import type { PlaceCard, ToolType } from '@/shared/types'
import { useCanvasStore } from '@/pages/room/stores/canvasStore'

interface GhostLayerProps {
  effectiveTool: ToolType
  pendingPlaceCard: Omit<PlaceCard, 'x' | 'y'> | null
}

export const GhostLayer = memo(({ effectiveTool, pendingPlaceCard }: GhostLayerProps) => {
  const cursorPos = useCanvasStore(state => state.cursorPos)
  const placeCardCursorPos = useCanvasStore(state => state.placeCardCursorPos)
  return (
    <Layer>
      {effectiveTool === 'postIt' && !pendingPlaceCard && cursorPos && (
        <Group x={cursorPos.x - 75} y={cursorPos.y - 75} listening={false}>
          <Rect width={150} height={150} fill={DEFAULT_POST_IT_COLOR} opacity={0.6} cornerRadius={8} stroke="#9CA3AF" strokeWidth={2} dash={[5, 5]} />
          <Text x={0} y={65} width={150} text="클릭해서 추가하기" align="center" fill="#6B7280" fontSize={14} />
        </Group>
      )}

      {effectiveTool === 'textBox' && !pendingPlaceCard && cursorPos && (
        <Group x={cursorPos.x - 100} y={cursorPos.y - 25} listening={false}>
          <Rect width={200} height={50} fill="transparent" opacity={0.6} stroke="#9CA3AF" strokeWidth={1} dash={[5, 5]} />
          <Text x={0} y={17} width={200} text="클릭해서 추가하기" align="center" fill="#6B7280" fontSize={14} />
        </Group>
      )}

      {pendingPlaceCard && placeCardCursorPos && placeCardCursorPos.cardId === pendingPlaceCard.id && (
        <Group x={placeCardCursorPos.x - PLACE_CARD_WIDTH / 2} y={placeCardCursorPos.y - PLACE_CARD_HEIGHT / 2} listening={false}>
          <Rect
            width={PLACE_CARD_WIDTH}
            height={PLACE_CARD_HEIGHT}
            fill="#FFFFFF"
            opacity={0.8}
            cornerRadius={10}
            stroke="#9CA3AF"
            strokeWidth={2}
            dash={[6, 6]}
            shadowBlur={15}
            shadowOffsetY={4}
            shadowOpacity={0.1}
          />
          <Rect width={PLACE_CARD_WIDTH} height={100} fill="#E5E7EB" opacity={0.8} cornerRadius={[10, 10, 0, 0]} />
          <Text
            text={pendingPlaceCard.name}
            x={12}
            y={110}
            width={PLACE_CARD_WIDTH - 24}
            fontSize={14}
            fontFamily="Arial, sans-serif"
            fontStyle="bold"
            fill="#374151"
            ellipsis={true}
            wrap="none"
          />
          {pendingPlaceCard.rating != null && (
            <>
              <Text text="★" x={12} y={130} fontSize={11} fill="#FACC15" />
              <Text
                text={`${pendingPlaceCard.rating.toFixed(1)}${pendingPlaceCard.userRatingCount ? ` (${pendingPlaceCard.userRatingCount.toLocaleString()})` : ''}`}
                x={26}
                y={130}
                width={PLACE_CARD_WIDTH - 38}
                fontSize={11}
                fill="#6B7280"
              />
            </>
          )}
          <Text
            text={pendingPlaceCard.category || ''}
            x={12}
            y={pendingPlaceCard.rating != null ? 146 : 130}
            width={PLACE_CARD_WIDTH - 24}
            fontSize={11}
            fill="#6B7280"
          />
          <Text
            text={pendingPlaceCard.address}
            x={12}
            y={pendingPlaceCard.rating != null ? 162 : 146}
            width={PLACE_CARD_WIDTH - 24}
            fontSize={11}
            fontFamily="Arial, sans-serif"
            fill="#6B7280"
            wrap="char"
          />
        </Group>
      )}
    </Layer>
  )
})

GhostLayer.displayName = 'GhostLayer'
