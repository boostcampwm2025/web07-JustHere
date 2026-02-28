import type { SelectionBox } from '@/shared/types'
import { create } from 'zustand'

interface CanvasState {
  cursorPos: { x: number; y: number } | null
  setCursorPos: (pos: { x: number; y: number } | null) => void
  placeCardCursorPos: { x: number; y: number; cardId: string } | null
  setPlaceCardCursorPos: (pos: { x: number; y: number; cardId: string } | null) => void
  selectionBox: SelectionBox | null
  setSelectionBox: (box: SelectionBox | null | ((prev: SelectionBox | null) => SelectionBox | null)) => void
}

export const useCanvasStore = create<CanvasState>(set => ({
  cursorPos: null,
  setCursorPos: pos => set({ cursorPos: pos }),
  placeCardCursorPos: null,
  setPlaceCardCursorPos: pos => set({ placeCardCursorPos: pos }),
  selectionBox: null,
  setSelectionBox: updater =>
    set(state => ({
      selectionBox: typeof updater === 'function' ? updater(state.selectionBox) : updater,
    })),
}))
