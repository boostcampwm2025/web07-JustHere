export type ToggleType = 'map' | 'canvas'

export type ToolType = 'cursor' | 'hand' | 'pencil' | 'postIt' | 'textBox'

export const CANVAS_ITEM_TYPE = {
  POST_IT: 'postit',
  LINE: 'line',
  PLACE_CARD: 'placeCard',
  TEXT_BOX: 'textBox',
} as const

export type CanvasItemType = (typeof CANVAS_ITEM_TYPE)[keyof typeof CANVAS_ITEM_TYPE]

export const YJS_TYPE: Record<CanvasItemType | 'Z_RANK_BY_KEY', string> = {
  [CANVAS_ITEM_TYPE.POST_IT]: 'postits',
  [CANVAS_ITEM_TYPE.LINE]: 'lines',
  [CANVAS_ITEM_TYPE.PLACE_CARD]: 'placeCards',
  [CANVAS_ITEM_TYPE.TEXT_BOX]: 'textBoxes',
  Z_RANK_BY_KEY: 'zRankByKey',
}

type DraggableCanvasItemType = (typeof CANVAS_ITEM_TYPE)[keyof Pick<typeof CANVAS_ITEM_TYPE, 'POST_IT' | 'PLACE_CARD' | 'TEXT_BOX'>]

export type DragInitialState =
  | {
      type: DraggableCanvasItemType
      x: number
      y: number
    }
  | { type: typeof CANVAS_ITEM_TYPE.LINE; points: number[] }

export interface SelectedItem {
  id: string
  type: CanvasItemType
}

// 드래그 선택 영역 (투명 사각형)
export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

// Bounding Box 인터페이스 (충돌 감지용)
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PostIt {
  id: string
  x: number
  y: number
  width: number
  height: number
  scale: number
  fill: string
  text: string // 포스트잇 내용
  authorName: string // 작성자 이름
}

export interface PlaceCard {
  id: string
  placeId: string
  name: string
  address: string
  x: number
  y: number
  width: number // 카드 너비 (기본값: 240)
  height: number // 카드 높이 (기본값: 180)
  scale: number
  createdAt: string
  image?: string | null
  category: string
  rating?: number
  userRatingCount?: number
}

export interface Line {
  id: string
  points: number[] // [x1, y1, x2, y2, x3, y3, ...] 형식의 좌표 배열
  stroke: string // 선 색상
  strokeWidth: number // 선 두께
  tension: number // 곡선 부드러움 (0-1)
  lineCap: 'round' | 'butt' | 'square' // 선 끝 모양
  lineJoin: 'round' | 'bevel' | 'miter' // 선 연결 모양
  tool: 'pen' // 나중에 eraser 등 추가 가능
}

export interface TextBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  scale: number
  text: string
  authorName: string
}
