export type TutorialPlace = {
  id: number
  name: string
  category: string
  rating: number
  reviews: number
  address: string
  image?: string
}

export type TutorialPlaceCandidate = {
  id: number
  place: TutorialPlace
}
