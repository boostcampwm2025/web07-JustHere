export type Tool = 'cursor' | 'pen' | 'rectangle'

export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
}
