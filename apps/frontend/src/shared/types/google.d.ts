export interface GooglePhoto {
  name: string
  widthPx: number
  heightPx: number
}

export interface GoogleReview {
  name: string
  rating: number
  text?: {
    text: string
    languageCode: string
  }
  authorAttribution: {
    displayName: string
    uri: string
    photoUri: string
  }
  publishTime: string
  relativePublishTimeDescription: string
}

export interface GooglePlace {
  id: string
  displayName: {
    text: string
    languageCode: string
  }
  formattedAddress: string
  location: {
    latitude: number
    longitude: number
  }
  rating?: number
  userRatingCount?: number
  photos?: GooglePhoto[]
  reviews?: GoogleReview[]
  reviewSummary?: {
    text: {
      text: string
      languageCode: string
    }
  }
  generativeSummary?: {
    overview: {
      text: string
      languageCode: string
    }
    overviewFlagContentUri?: string
    disclosureText?: {
      text: string
      languageCode: string
    }
  }
  regularOpeningHours?: {
    openNow: boolean
    weekdayDescriptions: string[]
  }
  priceLevel?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: {
    text: string
    languageCode: string
  }
}

export interface GoogleSearchResponse {
  places: GooglePlace[]
  nextPageToken?: string
}
