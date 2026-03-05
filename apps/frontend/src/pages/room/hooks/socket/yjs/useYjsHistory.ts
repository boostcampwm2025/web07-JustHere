import { useCallback, useEffect, useRef, useState } from 'react'
import { UndoManager as YUndoManager } from 'yjs'
import { CAPTURE_FREQUENCY } from '@/pages/room/constants'
import type { YjsSharedTypes } from '@/pages/room/types'

interface UseYjsHistoryProps {
  sharedTypes: YjsSharedTypes | null
  localOriginRef: { current: unknown }
}

export const useYjsHistory = ({ sharedTypes, localOriginRef }: UseYjsHistoryProps) => {
  const undoManagerRef = useRef<YUndoManager | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateHistoryState = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    setCanUndo(undoManager.canUndo())
    setCanRedo(undoManager.canRedo())
  }, [])

  useEffect(() => {
    if (!sharedTypes) {
      undoManagerRef.current = null
      return
    }

    const undoManager = new YUndoManager(
      [sharedTypes.yPostits, sharedTypes.yPlaceCards, sharedTypes.yLines, sharedTypes.yTextBoxes, sharedTypes.yZRankByKey],
      {
        trackedOrigins: new Set([localOriginRef.current]),
        captureTimeout: CAPTURE_FREQUENCY,
      },
    )
    undoManagerRef.current = undoManager

    const handleStackChange = () => {
      updateHistoryState()
    }

    undoManager.on('stack-item-added', handleStackChange)
    undoManager.on('stack-item-popped', handleStackChange)
    undoManager.on('stack-item-updated', handleStackChange)
    undoManager.on('stack-cleared', handleStackChange)

    return () => {
      undoManager.off('stack-item-added', handleStackChange)
      undoManager.off('stack-item-popped', handleStackChange)
      undoManager.off('stack-item-updated', handleStackChange)
      undoManager.off('stack-cleared', handleStackChange)
      undoManager.destroy()
      undoManagerRef.current = null
    }
  }, [sharedTypes, localOriginRef, updateHistoryState])

  const undo = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.undo()
    updateHistoryState()
  }, [updateHistoryState])

  const redo = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.redo()
    updateHistoryState()
  }, [updateHistoryState])

  const stopCapturing = useCallback(() => {
    const undoManager = undoManagerRef.current
    if (!undoManager) return
    undoManager.stopCapturing()
    updateHistoryState()
  }, [updateHistoryState])

  const safeCanUndo = sharedTypes ? canUndo : false
  const safeCanRedo = sharedTypes ? canRedo : false

  return {
    undoManagerRef,
    canUndo: safeCanUndo,
    canRedo: safeCanRedo,
    undo,
    redo,
    stopCapturing,
    updateHistoryState,
  }
}
