import { CoffeeIcon, CompassIcon, LiquorIcon, PencilIcon, SilverwareForkKnifeIcon } from '@/shared/assets'
import type { CategoryItem } from '@/pages/room/types'

export const MAX_CUSTOM_LEN = 15

export const CATEGORIES: readonly CategoryItem[] = [
  { name: '음식점', icon: SilverwareForkKnifeIcon },
  { name: '카페', icon: CoffeeIcon },
  { name: '술집', icon: LiquorIcon },
  { name: '가볼만한곳', icon: CompassIcon },
  { name: '직접 입력', icon: PencilIcon, isCustom: true },
] as const
