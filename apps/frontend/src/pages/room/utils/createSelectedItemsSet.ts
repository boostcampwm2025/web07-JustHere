import type { SelectedItem } from '@/shared/types'

type CreateSelectedItemsSetOptions = {
  filter?: (item: SelectedItem) => boolean
  keyFn: (item: SelectedItem) => string
}

export function createSelectedItemsSet(selectedItems: SelectedItem[], options: CreateSelectedItemsSetOptions): Set<string> {
  return new Set(selectedItems.filter(item => !options.filter || options.filter(item)).map(options.keyFn))
}
