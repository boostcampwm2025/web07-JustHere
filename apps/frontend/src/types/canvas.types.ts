export type Tool = 'cursor' | 'pen' | 'rectangle'

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
