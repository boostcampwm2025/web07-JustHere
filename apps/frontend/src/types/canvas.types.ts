export type Tool = 'cursor' | 'pen' | 'rectangle'

export type CanvasItemType = 'postit' | 'line'

export interface SelectedItem {
  id: string
  type: CanvasItemType
}

export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
}

export interface PostIt {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  text: string // 포스트잇 내용
  authorName: string // 작성자 이름
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
