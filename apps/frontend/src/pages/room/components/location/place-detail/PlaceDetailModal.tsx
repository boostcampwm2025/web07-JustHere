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

export const PlaceDetailModal = ({ place, onClose }: PlaceDetailModalProps) => {
  const { data: placeDetails, isLoading } = useGooglePlaceDetails(place.id)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  const details = placeDetails || place

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

            {/* 장소 소개 (AI 생성) */}
            {details.generativeSummary?.overview?.text && (
              <div className="p-6 border-b border-gray-100 bg-blue-50">
                <h4 className="font-semibold mb-2 text-blue-800">장소 소개</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{details.generativeSummary.overview.text}</p>
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
                {getPriceLevelText(details.priceLevel) && <span className="text-gray-600 font-medium">{getPriceLevelText(details.priceLevel)}</span>}
              </div>

              {/* 주소 */}
              <p className="text-gray-700">{details.formattedAddress}</p>
            </div>

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

            {/* 리뷰 요약 */}
            {details.reviewSummary?.text?.text && (
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h4 className="font-semibold mb-2">리뷰 요약</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{details.reviewSummary.text.text}</p>
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
