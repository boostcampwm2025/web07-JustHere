export const GOOGLE_PLACES_API = {
  BASE_URL: 'https://places.googleapis.com/v1',
  TIMEOUT_MS: 10000,
  LANGUAGE_CODE: 'ko',
} as const

export const GOOGLE_PLACE_FIELD_MASKS = {
  SEARCH: [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.photos',
    'places.reviews',
    'places.regularOpeningHours',
    'places.priceLevel',
    'places.priceRange',
    'places.nationalPhoneNumber',
    'places.websiteUri',
    'places.types',
    'places.primaryType',
    'places.primaryTypeDisplayName',
    'places.parkingOptions',
    'places.reservable',
    'places.allowsDogs',
    'nextPageToken',
  ].join(','),
  DETAILS: [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'rating',
    'userRatingCount',
    'photos',
    'reviews',
    'regularOpeningHours',
    'priceRange',
    'nationalPhoneNumber',
    'websiteUri',
    'types',
    'primaryType',
    'primaryTypeDisplayName',
    'parkingOptions',
    'reservable',
    'allowsDogs',
  ].join(','),
} as const

export const GOOGLE_SEARCH_DEFAULTS = {
  MAX_RESULT_COUNT: 20,
  RADIUS_METERS: 2000,
} as const

export const GOOGLE_PHOTO_DEFAULTS = {
  MAX_WIDTH_PX: 400,
  MAX_HEIGHT_PX: 400,
} as const
