import { useState } from 'react'
import type { MouseEvent } from 'react'
import type { TutorialPlaceCard, TutorialStickyNote } from '@/pages/landing/types'
import { useSpaceKey } from './useSpaceKey'

const COLORS = ['#fff4a3', '#ffd4a3', '#ffa3d4', '#a3d4ff', '#d4ffa3']

const PLACES = [
  { name: '대봉', category: '한식', rating: 4.3 },
  { name: '소보리 강남점', category: '일식', rating: 4.7 },
  { name: '대성집삼성점', category: '한식', rating: 4.4 },
]

export function useCanvasDrag() {
  const { isSpacePressed } = useSpaceKey()

  const [stickyNotes, setStickyNotes] = useState<TutorialStickyNote[]>([])
  const [placeCards, setPlaceCards] = useState<TutorialPlaceCard[]>([])
  const [selectedTool, setSelectedTool] = useState<'move' | 'hand' | 'sticky' | 'place'>('move')
  const [draggedNote, setDraggedNote] = useState<number | null>(null)
  const [draggedCard, setDraggedCard] = useState<number | null>(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const addStickyNote = () => {
    setStickyNotes(prev => {
      const id = prev.length > 0 ? prev[prev.length - 1].id + 1 : 1
      const newNote: TutorialStickyNote = {
        id,
        text: '새 메모',
        x: Math.random() * 300 + 100,
        y: Math.random() * 200 + 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
      return [...prev, newNote]
    })
  }

  const addPlaceCard = () => {
    setPlaceCards(prev => {
      const place = PLACES[Math.floor(Math.random() * PLACES.length)]
      const id = prev.length > 0 ? prev[prev.length - 1].id + 1 : 1
      const newCard: TutorialPlaceCard = {
        id,
        ...place,
        x: Math.random() * 300 + 400,
        y: Math.random() * 200 + 100,
      }
      return [...prev, newCard]
    })
  }

  const deleteNote = (id: number) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id))
  }

  const deleteCard = (id: number) => {
    setPlaceCards(prev => prev.filter(card => card.id !== id))
  }

  const handleNoteMouseDown = (id: number, e: MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'move') {
      setDraggedNote(id)
      e.preventDefault()
    }
  }

  const handleCardMouseDown = (id: number, e: MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'move') {
      setDraggedCard(id)
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setCanvasOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }))
      return
    }
    if (draggedNote !== null) {
      setStickyNotes(notes => notes.map(note => (note.id === draggedNote ? { ...note, x: note.x + e.movementX, y: note.y + e.movementY } : note)))
    }
    if (draggedCard !== null) {
      setPlaceCards(cards => cards.map(card => (card.id === draggedCard ? { ...card, x: card.x + e.movementX, y: card.y + e.movementY } : card)))
    }
  }

  const handleMouseUp = () => {
    setDraggedNote(null)
    setDraggedCard(null)
    setIsPanning(false)
  }

  const handleCanvasMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const isHandMode = selectedTool === 'hand' || isSpacePressed
    if (!isHandMode) return
    setIsPanning(true)
    e.preventDefault()
  }

  return {
    stickyNotes,
    setStickyNotes,
    placeCards,
    setPlaceCards,
    selectedTool,
    setSelectedTool,
    draggedNote,
    draggedCard,
    canvasOffset,
    isPanning,
    isSpacePressed,
    addStickyNote,
    addPlaceCard,
    deleteNote,
    deleteCard,
    handleNoteMouseDown,
    handleCardMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCanvasMouseDown,
  }
}
