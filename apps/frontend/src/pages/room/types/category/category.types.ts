import type { ElementType } from 'react'

export type CategoryName = '음식점' | '카페' | '술집' | '가볼만한곳' | '직접 입력'

export type CategoryItem = {
  name: CategoryName
  icon: ElementType
  isCustom?: boolean
}
