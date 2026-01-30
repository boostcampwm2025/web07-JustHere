export type TutorialStickyNote = {
  id: number
  text: string
  x: number
  y: number
  color: string
}

export type TutorialPlaceCard = {
  id: number
  name: string
  category: string
  rating: number
  x: number
  y: number
}

export type TutorialCategory = {
  id: number
  name: string
}

export type TutorialCursor = {
  id: string
  name: string
  x: number
  y: number
  color: string
}
