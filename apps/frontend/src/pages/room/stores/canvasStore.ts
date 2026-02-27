import { create } from 'zustand'

interface CanvasState {
  cursorPos: { x: number; y: number } | null
  setCursorPos: (pos: { x: number; y: number } | null) => void
  placeCardCursorPos: { x: number; y: number; cardId: string } | null
  setPlaceCardCursorPos: (pos: { x: number; y: number; cardId: string } | null) => void
}

export const useCanvasStore = create<CanvasState>(set => ({
  cursorPos: null,
  setCursorPos: pos => set({ cursorPos: pos }),
  placeCardCursorPos: null,
  setPlaceCardCursorPos: pos => set({ placeCardCursorPos: pos }),
}))
