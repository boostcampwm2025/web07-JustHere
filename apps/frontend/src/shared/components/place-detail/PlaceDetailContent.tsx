import { useGooglePlaceDetails } from '@/shared/hooks'
import type { GooglePlace } from '@/shared/types'
import { cn } from '@/shared/utils'
import { getPhotoUrl } from '@/shared/api'
import { renderStars, getPriceRangeText, getParkingText } from './place-detail.utils'
import { Button, ImageSlider } from '../ui'
import { ArrowLeftIcon } from '@/shared/assets'

type PlaceDetailContentProps = {
  place: GooglePlace
  className?: string
  showHeader?: boolean
  onBack?: () => void
}

export const PlaceDetailContent = ({ place, className, showHeader = false, onBack }: PlaceDetailContentProps) => {
  const { data: placeDetails, isLoading } = useGooglePlaceDetails(place.id)

  const details = placeDetails || place
  const priceRangeText = getPriceRangeText(details.priceRange)
  const parkingText = getParkingText(details.parkingOptions)

  const sliderImages =
    details.photos?.slice(0, 5).map(photo => ({
      src: getPhotoUrl(photo.name, 800),
      alt: details.displayName.text,
    })) || []

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <span className="text-gray-500">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full overflow-y-auto scrollbar-hide', className)}>
      {/* 헤더 (뒤로가기 버튼 + 가게 이름) */}
      {showHeader && (
        <div className="sticky top-0 z-10 flex items-center gap-3 pt-4 pb-4 pr-4 pl-2 bg-white border-b border-gray-100">
          {onBack && <Button onClick={onBack} size="icon" variant="ghost" icon={<ArrowLeftIcon className="size-5" />} aria-label="뒤로가기" />}
          <h2 className="font-bold text-lg truncate flex-1">{details.displayName.text}</h2>
        </div>
      )}

      {/* 사진 갤러리 */}
      {sliderImages.length > 0 && <ImageSlider images={sliderImages} className="h-64 shrink-0" />}

      {/* 기본 정보 */}
      <div className="p-6 border-b border-gray-100">
        {/* 제목 > showHeader 값이 false인 경우에만 (결과 카드) */}
        {!showHeader && <h2 className="font-bold text-xl mb-2">{details.displayName.text}</h2>}

        {/* 카테고리 */}
        {details.primaryTypeDisplayName && <p className="text-sm text-gray-500 mb-1">{details.primaryTypeDisplayName.text}</p>}

        {/* 평점 */}
        {details.rating && (
          <div className="flex items-center gap-2 mb-2">
            {renderStars(details.rating)}
            <span className="font-semibold">{details.rating.toFixed(1)}</span>
            {details.userRatingCount && <span className="text-gray-500 text-sm">({details.userRatingCount}개 리뷰)</span>}
          </div>
        )}

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
                  <img
                    src={
                      review.authorAttribution.photoUri ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorAttribution.displayName)}&background=random`
                    }
                    alt={review.authorAttribution.displayName}
                    className="w-8 h-8 rounded-full"
                    onError={e => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorAttribution.displayName)}&background=random`
                    }}
                  />
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
  )
}
