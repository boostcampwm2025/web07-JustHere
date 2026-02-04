/** 플레이스 카드(장소 카드) 크기 */
export const PLACE_CARD_WIDTH = 240
export const PLACE_CARD_HEIGHT = 220
export const PLACE_CARD_PADDING = 12
export const PLACE_CARD_IMAGE_HEIGHT = 100
export const PLACE_CARD_PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
export const PLACE_CARD_ROUNDED_RADIUS = 10

/** 포스트잇 기본 크기 */
export const POST_IT_WIDTH = 150
export const POST_IT_HEIGHT = 150

/** 포스트잇 기본 색상 (노란색) */
export const DEFAULT_POST_IT_COLOR = '#FEF08A'

/** 텍스트박스 기본 크기 */
export const TEXT_BOX_WIDTH = 200
export const TEXT_BOX_HEIGHT = 50

export const BASE_PADDING = 10

/** 텍스트 공통 스타일 */
export const TEXT_FONT_SIZE = 14
export const TEXT_FONT_FAMILY = 'Arial, sans-serif'
export const TEXT_LINE_HEIGHT = 1.4

/** 포스트잇 색상 목록 */
export const POST_IT_COLORS = [
  { color: '#FBCFE8', name: '분홍색' }, // pink-200
  { color: '#FED7AA', name: '주황색' }, // orange-200
  { color: DEFAULT_POST_IT_COLOR, name: '노란색' }, // yellow-200
  { color: '#D9F99D', name: '연두색' }, // lime-200
  { color: '#BFDBFE', name: '하늘색' }, // blue-200
]

/** 장소 카드 색상 */
export const PLACE_CARD_COLORS = {
  BACKGROUND: '#FFFFFF',
  BORDER: '#E5E7EB',
  TITLE: '#111827', // gray-900
  ADDRESS: '#4B5563', // gray-600
  CATEGORY: '#6B7280', // gray-500
}

/** 라인 기본 속성 */
export const DEFAULT_LINE = {
  stroke: '#000000',
  strokeWidth: 2,
  tension: 0.5,
  lineCap: 'round',
  lineJoin: 'round',
  tool: 'pen',
} as const
