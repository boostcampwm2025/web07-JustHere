import { useCallback, useEffect, useRef } from 'react'
import { addSocketBreadcrumb } from '@/shared/utils'
import { SUMMARY_FREQUENCY } from '@/pages/room/constants'

interface UseCanvasTelemetryOptions {
  roomId: string
  canvasId: string
}

export const useCanvasTelemetry = ({ roomId, canvasId }: UseCanvasTelemetryOptions) => {
  const summaryRef = useRef<Map<string, { count: number; bytes: number }>>(new Map())
  const summaryTimerRef = useRef<number | null>(null)
  const trackHighFreqRef = useRef<(key: string, bytes?: number) => void>(() => {})

  const flushSummary = useCallback(() => {
    if (summaryRef.current.size === 0) return

    summaryRef.current.forEach((stats, key) => {
      addSocketBreadcrumb(`${key}:summary`, {
        roomId,
        canvasId,
        count: stats.count,
        bytes: stats.bytes,
      })
    })

    summaryRef.current.clear()
    summaryTimerRef.current = null
  }, [roomId, canvasId])

  const trackHighFreq = useCallback(
    (key: string, bytes = 0) => {
      const current = summaryRef.current.get(key) ?? { count: 0, bytes: 0 }
      current.count += 1
      current.bytes += bytes
      summaryRef.current.set(key, current)

      if (summaryTimerRef.current == null) {
        summaryTimerRef.current = window.setTimeout(flushSummary, SUMMARY_FREQUENCY)
      }
    },
    [flushSummary],
  )

  useEffect(() => {
    trackHighFreqRef.current = trackHighFreq
  }, [trackHighFreq])

  useEffect(() => {
    return () => {
      flushSummary()
      if (summaryTimerRef.current != null) {
        window.clearTimeout(summaryTimerRef.current)
        summaryTimerRef.current = null
      }
    }
  }, [roomId, canvasId, flushSummary])

  return {
    trackHighFreq,
    trackHighFreqRef,
  }
}
