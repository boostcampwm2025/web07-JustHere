import { useState } from 'react'
import { Modal } from '@/shared/components'
import { useGooglePlaceDetails } from '@/shared/hooks'
import type { GooglePlace } from '@/shared/types'
import { cn } from '@/shared/utils'

type PlaceDetailModalProps = {
  place: GooglePlace
  onClose: () => void
}

const getPhotoUrl = (photoName: string, maxWidthPx = 400) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`
}

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <span className="text-yellow-500">
      {'★'.repeat(fullStars)}
      {hasHalfStar && '½'}
      {'☆'.repeat(emptyStars)}
    </span>
  )
}

const getPriceLevelText = (priceLevel?: string) => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return '무료'
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '₩'
    case 'PRICE_LEVEL_MODERATE':
      return '₩₩'
    case 'PRICE_LEVEL_EXPENSIVE':
      return '₩₩₩'
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '₩₩₩₩'
    default:
      return null
  }
}

const getPriceRangeText = (priceRange?: GooglePlace['priceRange']) => {
  if (!priceRange) return null
  const start = priceRange.startPrice?.units
  const end = priceRange.endPrice?.units
  if (start && end) return `${Number(start).toLocaleString()}원 ~ ${Number(end).toLocaleString()}원`
  if (start) return `${Number(start).toLocaleString()}원 ~`
  return null
}

const getParkingText = (parkingOptions?: GooglePlace['parkingOptions']) => {
  if (!parkingOptions) return null
  const options: string[] = []
  if (parkingOptions.freeParkingLot) options.push('무료 주차장')
  if (parkingOptions.paidParkingLot) options.push('유료 주차장')
  if (parkingOptions.freeStreetParking) options.push('무료 노상 주차')
  if (parkingOptions.paidStreetParking) options.push('유료 노상 주차')
  if (parkingOptions.freeGarageParking) options.push('무료 주차 빌딩')
  if (parkingOptions.paidGarageParking) options.push('유료 주차 빌딩')
  if (parkingOptions.valetParking) options.push('발렛 파킹')
  return options.length > 0 ? options.join(', ') : null
}

export const PlaceDetailModal = ({ place, onClose }: PlaceDetailModalProps) => {
  const { data: placeDetails, isLoading } = useGooglePlaceDetails(place.id)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  const details = placeDetails || place
  const priceLevelText = getPriceLevelText(details.priceLevel)
  const priceRangeText = getPriceRangeText(details.priceRange)
  const parkingText = getParkingText(details.parkingOptions)

  return (
    <Modal title={details.displayName.text} onClose={onClose} className="w-lg h-[85vh] max-h-[800px]">
      <Modal.Body className="p-0 flex-1 min-h-0 flex flex-col overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">로딩 중...</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* 사진 갤러리 */}
            {details.photos && details.photos.length > 0 && (
              <div className="relative">
                <img
                  src={getPhotoUrl(details.photos[selectedPhotoIndex].name, 800)}
                  alt={details.displayName.text}
                  className="w-full h-64 object-cover"
                />
                {details.photos.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {details.photos.slice(0, 5).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`사진 ${idx + 1} 보기`}
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={cn('w-2 h-2 rounded-full transition-colors', idx === selectedPhotoIndex ? 'bg-white' : 'bg-white/50')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 기본 정보 */}
            <div className="p-6 border-b border-gray-100">
              {/* 카테고리 */}
              {details.primaryTypeDisplayName && <p className="text-sm text-gray-500 mb-1">{details.primaryTypeDisplayName.text}</p>}

              {/* 평점 + 가격대 */}
              <div className="flex items-center gap-3 mb-2">
                {details.rating && (
                  <div className="flex items-center gap-2">
                    {renderStars(details.rating)}
                    <span className="font-semibold">{details.rating.toFixed(1)}</span>
                    {details.userRatingCount && <span className="text-gray-500 text-sm">({details.userRatingCount}개 리뷰)</span>}
                  </div>
                )}
                {priceLevelText && <span className="text-gray-600 font-medium">{priceLevelText}</span>}
              </div>

              {/* 가격 범위 */}
              {priceRangeText && <p className="text-sm text-gray-600 mb-2">{priceRangeText}</p>}

              {/* 주소 */}
              <p className="text-gray-700">{details.formattedAddress}</p>
            </div>

            {/* 편의시설 태그 */}
            {(details.reservable || details.allowsDogs || parkingText) && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {details.reservable && <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full">예약 가능</span>}
                  {details.allowsDogs && <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">반려동물 동반</span>}
                  {parkingText && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{parkingText}</span>}
                </div>
              </div>
            )}

            {/* 영업시간 */}
            {details.regularOpeningHours && (
              <div className="p-6 border-b border-gray-100">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  영업시간
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      details.regularOpeningHours.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                    )}
                  >
                    {details.regularOpeningHours.openNow ? '영업 중' : '영업 종료'}
                  </span>
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {details.regularOpeningHours.weekdayDescriptions.map((desc, idx) => (
                    <li key={idx}>{desc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 연락처 및 웹사이트 */}
            {(details.nationalPhoneNumber || details.websiteUri) && (
              <div className="p-6 border-b border-gray-100">
                {details.nationalPhoneNumber && (
                  <p className="mb-2">
                    <span className="text-gray-500">전화:</span>{' '}
                    <a href={`tel:${details.nationalPhoneNumber}`} className="text-primary hover:underline">
                      {details.nationalPhoneNumber}
                    </a>
                  </p>
                )}
                {details.websiteUri && (
                  <p>
                    <span className="text-gray-500">웹사이트:</span>{' '}
                    <a
                      href={details.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate inline-block max-w-[300px] align-bottom"
                    >
                      {details.websiteUri}
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* 리뷰 */}
            {details.reviews && details.reviews.length > 0 && (
              <div className="p-6">
                <h4 className="font-semibold mb-4">리뷰</h4>
                <div className="space-y-4">
                  {details.reviews.map((review, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        {review.authorAttribution.photoUri && (
                          <img src={review.authorAttribution.photoUri} alt={review.authorAttribution.displayName} className="w-8 h-8 rounded-full" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{review.authorAttribution.displayName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {renderStars(review.rating)}
                            <span>{review.relativePublishTimeDescription}</span>
                          </div>
                        </div>
                      </div>
                      {review.text?.text && <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.text.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}
