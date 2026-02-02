import * as Y from 'yjs'
import type { CanvasItemType } from '@/shared/types'

/**
 * zIndexOrder 마이그레이션 로직
 *
 * 초기화 시 기존 요소들을 zIndexOrder에 자동으로 추가합니다.
 * zIndexOrder에 없는 요소만 추가하여 데이터 일관성을 보장합니다.
 *
 * @deprecated 이 파일은 향후 제거 예정입니다.
 */
export function migrateZIndexOrder(
  yPostits: Y.Array<Y.Map<unknown>>,
  yPlaceCards: Y.Array<Y.Map<unknown>>,
  yLines: Y.Array<Y.Map<unknown>>,
  yTextBoxes: Y.Array<Y.Map<unknown>>,
  yZIndexOrder: Y.Array<Y.Map<unknown>>,
  localOrigin: symbol,
): void {
  // 기존 zIndexOrder에 있는 아이템들을 Set으로 변환 (빠른 조회를 위해)
  const existingZIndexKeys = new Set<string>()
  yZIndexOrder.toArray().forEach(yMap => {
    const type = yMap.get('type') as CanvasItemType
    const id = yMap.get('id') as string
    if (type && id) {
      existingZIndexKeys.add(`${type}:${id}`)
    }
  })

  // 추가할 zIndexOrder 아이템들을 수집
  const itemsToAdd: Array<{ type: CanvasItemType; id: string }> = []

  // PostIts 마이그레이션
  yPostits.toArray().forEach(yMap => {
    const id = yMap.get('id') as string
    if (id && !existingZIndexKeys.has(`postit:${id}`)) {
      itemsToAdd.push({ type: 'postit', id })
    }
  })

  // PlaceCards 마이그레이션
  yPlaceCards.toArray().forEach(yMap => {
    const id = yMap.get('id') as string
    if (id && !existingZIndexKeys.has(`placeCard:${id}`)) {
      itemsToAdd.push({ type: 'placeCard', id })
    }
  })

  // Lines 마이그레이션
  yLines.toArray().forEach(yMap => {
    const id = yMap.get('id') as string
    if (id && !existingZIndexKeys.has(`line:${id}`)) {
      itemsToAdd.push({ type: 'line', id })
    }
  })

  // TextBoxes 마이그레이션
  yTextBoxes.toArray().forEach(yMap => {
    const id = yMap.get('id') as string
    if (id && !existingZIndexKeys.has(`textBox:${id}`)) {
      itemsToAdd.push({ type: 'textBox', id })
    }
  })

  // 수집된 아이템들을 zIndexOrder에 추가
  if (itemsToAdd.length > 0) {
    const doc = yZIndexOrder.doc
    if (doc) {
      doc.transact(() => {
        itemsToAdd.forEach(({ type, id }) => {
          const zIndexMap = new Y.Map()
          zIndexMap.set('type', type)
          zIndexMap.set('id', id)
          yZIndexOrder.push([zIndexMap])
        })
      }, localOrigin)
    }
  }
}
