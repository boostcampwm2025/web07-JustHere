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
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
  nationalPhoneNumber?: string
  websiteUri?: string
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: {
    text: string
    languageCode: string
  }
}

export interface GooglePhoto {
  name: string
  widthPx: number
  heightPx: number
  authorAttributions: {
    displayName: string
    uri: string
    photoUri: string
  }[]
}

export interface GoogleReview {
  name: string
  rating: number
  text: {
    text: string
    languageCode: string
  }
  originalText?: {
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

export interface GoogleSearchMeta {
  nextPageToken?: string
}

export interface GoogleSearchResponse {
  places: GooglePlace[]
  nextPageToken?: string
}
