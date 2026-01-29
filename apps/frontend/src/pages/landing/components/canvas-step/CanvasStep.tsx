import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { NoteTextIcon, CursorIcon, MapCheckOutlineIcon, CloseIcon, PlusIcon, ArrowRightIcon, HandBackRightIcon } from '@/shared/assets'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components'

interface StickyNote {
  id: number
  text: string
  x: number
  y: number
  color: string
}

interface PlaceCard {
  id: number
  name: string
  category: string
  rating: number
  x: number
  y: number
}

interface Category {
  id: number
  name: string
}

interface Cursor {
  id: string
  name: string
  x: number
  y: number
  color: string
}

const COLORS = ['#fff4a3', '#ffd4a3', '#ffa3d4', '#a3d4ff', '#d4ffa3']

const PRESET_CATEGORIES = [{ name: '음식점' }, { name: '카페' }, { name: '술집' }, { name: '가볼만한곳' }]

const TUTORIAL_STEPS = [
  {
    title: '카테고리 추가하기',
    description: '+ 버튼을 클릭해 모임 유형을 선택하세요. 카테고리별로 별도의 캔버스가 생성됩니다.',
    action: 'addCategory',
    highlight: 'category',
  },
  {
    title: '의견 공유하기',
    description: '포스트잇 버튼을 클릭해 의견을 추가해보세요. 자유롭게 내용을 작성할 수 있습니다.',
    action: 'addSticky',
    highlight: 'sticky',
  },
  {
    title: '캔버스 조작하기',
    description: '선택 커서로 포스트잇을 드래그해보세요. 이동 커서를 사용하면 캔버스 전체를 이동할 수 있습니다.',
    action: 'moveElement',
    highlight: 'move',
  },
  {
    title: '실시간 협업하기',
    description: '같은 카테고리에 있는 참여자들의 커서가 실시간으로 표시됩니다. / 키를 눌러 커서 챗으로 소통할 수 있습니다.',
    action: 'showCursors',
    highlight: 'cursors',
  },
]

export const CanvasStep = () => {
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [placeCards, setPlaceCards] = useState<PlaceCard[]>([])
  const [selectedTool, setSelectedTool] = useState<'move' | 'hand' | 'sticky' | 'place'>('move')
  const [draggedNote, setDraggedNote] = useState<number | null>(null)
  const [draggedCard, setDraggedCard] = useState<number | null>(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [tutorialStep, setTutorialStep] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true)
  const [otherCursors, setOtherCursors] = useState<Cursor[]>([])
  const [cursorChat, setCursorChat] = useState<{ cursorId: string; text: string } | null>(null)

  useEffect(() => {
    if (tutorialStep === 3 && showTutorial) {
      const cursors: Cursor[] = [
        { id: '1', name: '지민', x: 200, y: 150, color: '#FF6B6B' },
        { id: '2', name: '수현', x: 450, y: 200, color: '#4ECDC4' },
      ]

      const initTimer = setTimeout(() => setOtherCursors(cursors), 0)
      const interval = setInterval(() => {
        setOtherCursors(prev =>
          prev.map(cursor => ({
            ...cursor,
            x: cursor.x + (Math.random() - 0.5) * 50,
            y: cursor.y + (Math.random() - 0.5) * 50,
          })),
        )
      }, 2000)

      return () => {
        clearTimeout(initTimer)
        clearInterval(interval)
      }
    } else {
      const clearTimer = setTimeout(() => setOtherCursors([]), 0)
      return () => clearTimeout(clearTimer)
    }
  }, [tutorialStep, showTutorial])

  useEffect(() => {
    if (!(tutorialStep === 3 && showTutorial)) return

    let hideTimer: number | undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      setCursorChat({ cursorId: '1', text: '여기 괜찮아 보여요!' })
      if (hideTimer) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setCursorChat(null), 3000)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [tutorialStep, showTutorial])

  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1)
    } else {
      setShowTutorial(false)
    }
  }

  const handleTutorialPrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1)
    }
  }

  const handleTutorialAction = () => {
    const currentStep = TUTORIAL_STEPS[tutorialStep]

    switch (currentStep.action) {
      case 'addCategory':
        if (categories.length === 0) {
          setShowCategoryModal(true)
        } else {
          handleTutorialNext()
        }
        break
      case 'addSticky':
        if (stickyNotes.length === 0) {
          addStickyNote()
        }
        handleTutorialNext()
        break
      case 'moveElement':
        handleTutorialNext()
        break
      case 'showCursors':
        handleTutorialNext()
        break
    }
  }

  const addCategory = (preset: { name: string }) => {
    const newCategory: Category = {
      id: categories.length > 0 ? categories[categories.length - 1].id + 1 : 1,
      name: preset.name,
    }
    setCategories([...categories, newCategory])
    setActiveCategory(newCategory.id)
    setShowCategoryModal(false)

    if (tutorialStep === 0 && showTutorial) {
      setTimeout(() => handleTutorialNext(), 500)
    }
  }

  const addStickyNote = () => {
    const newNote: StickyNote = {
      id: stickyNotes.length > 0 ? stickyNotes[stickyNotes.length - 1].id + 1 : 1,
      text: '새 메모',
      x: Math.random() * 300 + 100,
      y: Math.random() * 200 + 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
    setStickyNotes([...stickyNotes, newNote])
  }

  const addPlaceCard = () => {
    const places = [
      { name: '대봉', category: '한식', rating: 4.3 },
      { name: '소보리 강남점', category: '일식', rating: 4.7 },
      { name: '대성집삼성점', category: '한식', rating: 4.4 },
    ]
    const place = places[Math.floor(Math.random() * places.length)]
    const newCard: PlaceCard = {
      id: placeCards.length > 0 ? placeCards[placeCards.length - 1].id + 1 : 1,
      ...place,
      x: Math.random() * 300 + 400,
      y: Math.random() * 200 + 100,
    }
    setPlaceCards([...placeCards, newCard])
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      setIsSpacePressed(true)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setIsSpacePressed(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const deleteNote = (id: number) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id))
  }

  const deleteCard = (id: number) => {
    setPlaceCards(placeCards.filter(card => card.id !== id))
  }

  const hasActiveCanvas = activeCategory !== null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">캔버스에서 자유롭게 협업하세요</h1>
          <p className="text-lg text-gray">포스트잇과 장소 카드로 의견을 공유하고 실시간으로 함께 작업할 수 있습니다.</p>
        </motion.div>

        <div className="flex gap-6">
          {/* Left: Canvas Area */}
          <div className="flex-1">
            {/* Category Tabs */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-4 flex items-center gap-2"
            >
              <div className="relative">
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => setShowCategoryModal(prev => !prev)}
                  className={cn(
                    'size-10 rounded-full text-primary flex items-center justify-center transition-all',
                    showCategoryModal ? 'bg-primary text-white' : 'bg-primary-bg',
                    tutorialStep === 0 && showTutorial && 'ring-4 ring-primary ring-offset-2 animate-pulse',
                  )}
                  title="카테고리 추가"
                >
                  <PlusIcon className="size-5" />
                </motion.button>

                <AnimatePresence>
                  {showCategoryModal && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-1 w-md bg-gray-100 rounded-2xl shadow-2xl p-4 border border-gray-100 z-40"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {PRESET_CATEGORIES.map((preset, index) => (
                          <motion.button
                            key={preset.name}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => addCategory(preset)}
                            className="p-2 rounded-xl bg-white hover:bg-gray-200 transition-all text-left"
                          >
                            <p className="text-md text-center">{preset.name}</p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2 flex-1 overflow-x-auto">
                {categories.map(cat => (
                  <motion.button
                    key={cat.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl whitespace-nowrap transition-colors',
                      activeCategory === cat.id ? 'bg-gray-100 font-bold' : 'bg-white border-2 border-gray-100 hover:bg-gray-200',
                    )}
                  >
                    {cat.name}
                  </motion.button>
                ))}
              </div>

              {!showTutorial && (
                <Button
                  onClick={() => {
                    setTutorialStep(0)
                    setShowTutorial(true)
                  }}
                  className="shrink-0 bg-white border-2 border-gray-100 shadow-sm hover:bg-gray-100 text-gray-text px-4 py-2 rounded-xl"
                >
                  튜토리얼 다시보기
                </Button>
              )}
            </motion.div>

            {/* Canvas Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="relative w-full bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden"
              style={{ height: '500px' }}
            >
              {/* Toolbar - only show when canvas is active */}
              <AnimatePresence>
                {hasActiveCanvas && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 w-fit mb-4 bg-white rounded-full shadow-lg p-2 flex gap-2 justify-center z-10"
                  >
                    <button
                      onClick={() => setSelectedTool('move')}
                      className={cn(
                        'p-3 rounded-full transition-all',
                        selectedTool === 'move' ? 'bg-primary text-white' : 'bg-gray-100 text-gray hover:bg-primary-bg',
                        tutorialStep === 2 && showTutorial && 'ring-4 ring-primary ring-offset-2',
                      )}
                      title="선택 커서"
                    >
                      <CursorIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => setSelectedTool('hand')}
                      className={cn(
                        'p-3 rounded-full transition-all',
                        selectedTool === 'hand' ? 'bg-primary text-white' : 'bg-gray-100 text-gray hover:bg-primary-bg',
                      )}
                      title="이동 커서"
                    >
                      <HandBackRightIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTool('sticky')
                        addStickyNote()
                      }}
                      className={cn(
                        'p-3 rounded-full transition-all',
                        selectedTool === 'sticky' ? 'bg-primary text-white' : 'bg-gray-100 text-gray hover:bg-primary-bg',
                        tutorialStep === 1 && showTutorial && 'ring-4 ring-primary ring-offset-2 animate-pulse',
                      )}
                      title="포스트잇"
                    >
                      <NoteTextIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTool('place')
                        addPlaceCard()
                      }}
                      className={cn(
                        'p-3 rounded-full transition-colors',
                        selectedTool === 'place' ? 'bg-primary text-white' : 'bg-gray-100 text-gray hover:bg-primary-bg',
                      )}
                      title="장소 카드"
                    >
                      <MapCheckOutlineIcon className="size-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasActiveCanvas ? (
                <div
                  className={cn(
                    'relative w-full h-full bg-linear-to-br from-white via-gray-100 to-gray-100',
                    selectedTool === 'hand' || isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair',
                  )}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="absolute inset-0" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)` }}>
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="grid grid-cols-12 grid-rows-12 h-full">
                        {Array.from({ length: 144 }).map((_, i) => (
                          <div key={i} className="border border-gray-disable/10" />
                        ))}
                      </div>
                    </div>

                    {/* Other users' cursors */}
                    {otherCursors.map(cursor => (
                      <motion.div
                        key={cursor.id}
                        initial={{ scale: 0 }}
                        animate={{
                          scale: 1,
                          x: cursor.x,
                          y: cursor.y,
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="absolute z-50 pointer-events-none"
                        style={{ left: 0, top: 0 }}
                      >
                        <motion.div transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="relative">
                          <CursorIcon className="size-6" style={{ color: cursor.color }} />
                        </motion.div>
                        <div
                          className="absolute top-6 left-2 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap"
                          style={{ backgroundColor: cursor.color }}
                        >
                          {cursor.name}
                        </div>

                        {/* Cursor chat bubble */}
                        {tutorialStep === 3 && showTutorial && cursorChat?.cursorId === cursor.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            className="absolute left-6 -top-10 w-32 rounded-2xl bg-white shadow-xl border border-gray-100 px-3 py-2"
                          >
                            <p className="text-xs text-gray-text">{cursorChat.text}</p>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}

                    {/* Sticky Notes */}
                    {stickyNotes.map(note => (
                      <motion.div
                        key={note.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute',
                          left: `${note.x}px`,
                          top: `${note.y}px`,
                          backgroundColor: note.color,
                        }}
                        className={cn('w-40 h-40 p-4 rounded-lg shadow-lg cursor-move group', draggedNote === note.id ? 'z-50 scale-110' : 'z-10')}
                        onMouseDown={e => handleNoteMouseDown(note.id, e)}
                      >
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="absolute -top-2 -right-2 size-6 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <CloseIcon className="size-3 text-white" />
                        </button>
                        <textarea
                          className="w-full h-full bg-transparent outline-none resize-none"
                          value={note.text}
                          onChange={e => setStickyNotes(stickyNotes.map(n => (n.id === note.id ? { ...n, text: e.target.value } : n)))}
                        />
                      </motion.div>
                    ))}

                    {/* Place Cards */}
                    {placeCards.map(card => (
                      <motion.div
                        key={card.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute',
                          left: `${card.x}px`,
                          top: `${card.y}px`,
                        }}
                        className={cn(
                          'w-48 bg-white rounded-xl shadow-xl cursor-move group border-2 border-gray-100',
                          draggedCard === card.id ? 'z-50 scale-110' : 'z-10',
                        )}
                        onMouseDown={e => handleCardMouseDown(card.id, e)}
                      >
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="absolute -top-2 -right-2 size-6 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <CloseIcon className="size-3 text-white" />
                        </button>
                        <div className="h-24 bg-linear-to-br from-primary-bg to-white rounded-t-xl" />
                        <div className="p-3">
                          <h4 className="font-bold text-sm mb-1">{card.name}</h4>
                          <p className="text-xs text-gray mb-2">{card.category}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-xs font-medium">{card.rating}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full bg-linear-to-br from-white via-gray-100 to-gray-100 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                  >
                    <h3 className="text-xl font-bold mb-2">카테고리를 추가해주세요</h3>
                    <p className="text-gray mb-4">
                      좌측 상단의 <span className="font-bold text-primary">+ 버튼</span>을 눌러
                      <br />
                      모임 유형을 선택하면 캔버스가 생성됩니다.
                    </p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Tutorial Panel */}
          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.4 }}
                className="w-80"
              >
                <div className="sticky top-24 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-6">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-1">
                      {TUTORIAL_STEPS.map((_, index) => (
                        <div
                          key={index}
                          className={cn('h-1.5 rounded-full transition-all', index === tutorialStep ? 'w-8 bg-primary' : 'w-1.5 bg-gray-200')}
                        />
                      ))}
                    </div>
                    <button onClick={() => setShowTutorial(false)} className="text-gray hover:text-black transition-colors">
                      <CloseIcon className="size-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <motion.div
                    key={tutorialStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-6">
                      <div className="text-sm text-gray mb-2">
                        Step {tutorialStep + 1} / {TUTORIAL_STEPS.length}
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                      <p className="text-gray leading-relaxed">{TUTORIAL_STEPS[tutorialStep].description}</p>
                    </div>

                    {/* Action Button */}
                    {tutorialStep < TUTORIAL_STEPS.length - 1 && (
                      <Button onClick={handleTutorialAction} className="w-full py-3 mb-3">
                        {tutorialStep === 0 && categories.length === 0
                          ? '카테고리 추가'
                          : tutorialStep === 1 && stickyNotes.length === 0
                            ? '포스트잇 추가'
                            : '다음 단계'}
                        <ArrowRightIcon className="size-4 ml-2" />
                      </Button>
                    )}

                    {tutorialStep === TUTORIAL_STEPS.length - 1 && (
                      <Button onClick={() => setShowTutorial(false)} className="w-full  py-3 mb-3">
                        튜토리얼 완료
                      </Button>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-2">
                      {tutorialStep > 0 && (
                        <Button onClick={handleTutorialPrev} variant="gray" size="lg" className="flex-1 h-fit py-2.5">
                          이전
                        </Button>
                      )}
                      {tutorialStep < TUTORIAL_STEPS.length - 1 && (
                        <Button onClick={handleTutorialNext} variant="gray" size="lg" className="flex-1 h-fit py-2.5">
                          건너뛰기
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
