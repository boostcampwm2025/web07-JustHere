import type { GooglePlace } from '@/shared/types'

export const renderStars = (rating: number) => {
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

export const getPriceRangeText = (priceRange?: GooglePlace['priceRange']) => {
  if (!priceRange) return null
  const start = priceRange.startPrice?.units
  const end = priceRange.endPrice?.units
  if (start && end) return `${Number(start).toLocaleString()}원 ~ ${Number(end).toLocaleString()}원`
  if (start) return `${Number(start).toLocaleString()}원 ~`
  return null
}

export const getParkingText = (parkingOptions?: GooglePlace['parkingOptions']) => {
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
