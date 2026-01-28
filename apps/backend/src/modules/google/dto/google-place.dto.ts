import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class GooglePhotoDto {
  @ApiProperty()
  name: string

  @ApiProperty()
  widthPx: number

  @ApiProperty()
  heightPx: number

  @ApiPropertyOptional()
  authorAttributions?: {
    displayName: string
    uri: string
    photoUri: string
  }[]
}

export class GoogleReviewDto {
  @ApiProperty()
  name: string

  @ApiProperty()
  rating: number

  @ApiPropertyOptional()
  text?: {
    text: string
    languageCode: string
  }

  @ApiPropertyOptional()
  originalText?: {
    text: string
    languageCode: string
  }

  @ApiProperty()
  authorAttribution: {
    displayName: string
    uri: string
    photoUri: string
  }

  @ApiProperty()
  publishTime: string

  @ApiProperty()
  relativePublishTimeDescription: string
}

export class GooglePlaceDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  displayName: {
    text: string
    languageCode: string
  }

  @ApiProperty()
  formattedAddress: string

  @ApiProperty()
  location: {
    latitude: number
    longitude: number
  }

  @ApiPropertyOptional()
  rating?: number

  @ApiPropertyOptional()
  userRatingCount?: number

  @ApiPropertyOptional({ type: [GooglePhotoDto] })
  photos?: GooglePhotoDto[]

  @ApiPropertyOptional({ type: [GoogleReviewDto] })
  reviews?: GoogleReviewDto[]

  @ApiPropertyOptional()
  regularOpeningHours?: {
    openNow: boolean
    weekdayDescriptions: string[]
  }

  @ApiPropertyOptional()
  priceRange?: {
    startPrice?: {
      currencyCode: string
      units: string
    }
    endPrice?: {
      currencyCode: string
      units: string
    }
  }

  @ApiPropertyOptional()
  nationalPhoneNumber?: string

  @ApiPropertyOptional()
  websiteUri?: string

  @ApiPropertyOptional({ type: [String] })
  types?: string[]

  @ApiPropertyOptional()
  primaryType?: string

  @ApiPropertyOptional()
  primaryTypeDisplayName?: {
    text: string
    languageCode: string
  }

  @ApiPropertyOptional()
  parkingOptions?: {
    freeParkingLot?: boolean
    paidParkingLot?: boolean
    freeStreetParking?: boolean
    paidStreetParking?: boolean
    valetParking?: boolean
    freeGarageParking?: boolean
    paidGarageParking?: boolean
  }

  @ApiPropertyOptional()
  reservable?: boolean

  @ApiPropertyOptional()
  allowsDogs?: boolean
}

export class GoogleSearchResponseDto {
  @ApiProperty({ type: [GooglePlaceDto] })
  @Type(() => GooglePlaceDto)
  places: GooglePlaceDto[]

  @ApiPropertyOptional()
  nextPageToken?: string
}
