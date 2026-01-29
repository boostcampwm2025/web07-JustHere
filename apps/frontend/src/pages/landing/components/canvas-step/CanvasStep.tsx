import { motion, AnimatePresence } from 'motion/react'
import { NoteTextIcon, CursorIcon, MapCheckOutlineIcon, CloseIcon, PlusIcon, ArrowRightIcon, HandBackRightIcon } from '@/shared/assets'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components'
import { PRESET_CATEGORIES, CANVAS_TUTORIAL_STEPS } from '@/pages/landing/constants'
import { useTutorialStep, useCategories, useCanvasDrag } from '@/pages/landing/hooks'
import type { TutorialCursor, TutorialCategory, TutorialStickyNote, TutorialPlaceCard } from '@/pages/landing/types'

export const CanvasStep = () => {
  const { tutorialStep, setTutorialStep, showTutorial, setShowTutorial, otherCursors, cursorChat, handleTutorialNext, handleTutorialPrev } =
    useTutorialStep()

  const { addCategory, categories, activeCategory, setActiveCategory, showCategoryModal, setShowCategoryModal } = useCategories({
    onCategoryAdded: () => {
      if (tutorialStep === 0 && showTutorial) {
        setTimeout(() => handleTutorialNext(), 500)
      }
    },
  })

  const {
    stickyNotes,
    setStickyNotes,
    placeCards,
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
  } = useCanvasDrag()

  const handleTutorialAction = () => {
    const currentStep = CANVAS_TUTORIAL_STEPS[tutorialStep]

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
                  onClick={() => setShowCategoryModal((prev: boolean) => !prev)}
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
                {categories.map((cat: TutorialCategory) => (
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
              {/* Toolbar */}
              <AnimatePresence>
                {activeCategory !== null && (
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

              {activeCategory !== null ? (
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
                    {otherCursors.map((cursor: TutorialCursor) => (
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
                            <p className="text-xs text-gray-text">{cursorChat?.text}</p>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}

                    {/* Sticky Notes */}
                    {stickyNotes.map((note: TutorialStickyNote) => (
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
                          onChange={e =>
                            setStickyNotes(stickyNotes.map((n: TutorialStickyNote) => (n.id === note.id ? { ...n, text: e.target.value } : n)))
                          }
                        />
                      </motion.div>
                    ))}

                    {/* Place Cards */}
                    {placeCards.map((card: TutorialPlaceCard) => (
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
                      {CANVAS_TUTORIAL_STEPS.map((_, index) => (
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
                        Step {tutorialStep + 1} / {CANVAS_TUTORIAL_STEPS.length}
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{CANVAS_TUTORIAL_STEPS[tutorialStep].title}</h3>
                      <p className="text-gray leading-relaxed">{CANVAS_TUTORIAL_STEPS[tutorialStep].description}</p>
                    </div>

                    {/* Action Button */}
                    {tutorialStep < CANVAS_TUTORIAL_STEPS.length - 1 && (
                      <Button onClick={handleTutorialAction} className="w-full py-3 mb-3">
                        {tutorialStep === 0 && categories.length === 0
                          ? '카테고리 추가'
                          : tutorialStep === 1 && stickyNotes.length === 0
                            ? '포스트잇 추가'
                            : '다음 단계'}
                        <ArrowRightIcon className="size-4 ml-2" />
                      </Button>
                    )}

                    {tutorialStep === CANVAS_TUTORIAL_STEPS.length - 1 && (
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
                      {tutorialStep < CANVAS_TUTORIAL_STEPS.length - 1 && (
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
