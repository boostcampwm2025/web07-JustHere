import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Group } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import { CursorIcon } from '@/shared/assets'
import type { CursorInfoWithId } from '@/shared/types'
import { getCursorColor, getParticipantColor, cn } from '@/shared/utils'

interface AnimatedCursorProps {
  cursor: CursorInfoWithId
}

export const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const groupRef = useRef<Konva.Group>(null)

  const targetRef = useRef({ x: cursor.x, y: cursor.y })
  const currentRef = useRef({ x: cursor.x, y: cursor.y })

  const animationRef = useRef<Konva.Animation | null>(null)

  const [isChatFading, setIsChatFading] = useState(false)
  const [isChatFaded, setIsChatFaded] = useState(false)
  const chatInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChatMessageRef = useRef(cursor.chatMessage)

  const deactivateFade = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
      chatInactivityTimerRef.current = null
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)
    setIsChatFaded(false)
  }, [])

  const startFadeOut = useCallback(() => {
    setIsChatFading(true)
    chatFadeTimerRef.current = setTimeout(() => {
      setIsChatFading(false)
      setIsChatFaded(true)
      chatFadeTimerRef.current = null
    }, 3000)
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    setIsChatFading(false)
    setIsChatFaded(false)

    chatInactivityTimerRef.current = setTimeout(() => {
      startFadeOut()
    }, 3000)
  }, [startFadeOut])

  useEffect(() => {
    if (cursor.chatActive) {
      if (prevChatMessageRef.current !== cursor.chatMessage) {
        prevChatMessageRef.current = cursor.chatMessage
        resetInactivityTimer()
      }
    } else {
      deactivateFade()
    }
  }, [cursor.chatActive, cursor.chatMessage, resetInactivityTimer, deactivateFade])

  useEffect(() => {
    return () => {
      if (chatInactivityTimerRef.current) {
        clearTimeout(chatInactivityTimerRef.current)
      }
      if (chatFadeTimerRef.current) {
        clearTimeout(chatFadeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    targetRef.current = { x: cursor.x, y: cursor.y }
  }, [cursor.x, cursor.y])

  useEffect(() => {
    if (!groupRef.current) return

    const initialX = cursor.x
    const initialY = cursor.y
    currentRef.current = { x: initialX, y: initialY }
    groupRef.current.x(initialX)
    groupRef.current.y(initialY)

    const animation = new Konva.Animation(() => {
      if (!groupRef.current) return

      const current = currentRef.current
      const target = targetRef.current

      const lerpFactor = 0.2

      current.x += (target.x - current.x) * lerpFactor
      current.y += (target.y - current.y) * lerpFactor

      const distance = Math.sqrt(Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2))
      if (distance < 0.5) {
        current.x = target.x
        current.y = target.y
      }

      groupRef.current.x(current.x)
      groupRef.current.y(current.y)
    }, groupRef.current.getLayer())

    animation.start()
    animationRef.current = animation

    return () => {
      animation.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Group ref={groupRef}>
      <Html
        transformFunc={attrs => ({
          ...attrs,
          scaleX: 1,
          scaleY: 1,
        })}
        divProps={{
          style: {
            pointerEvents: 'none',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: 'max-content',
          },
        }}
      >
        <div className="relative flex flex-col items-start overflow-visible">
          <CursorIcon className={cn('w-6 h-6 drop-shadow-md', getCursorColor(cursor.name))} />

          <div
            className={cn(
              'ml-5 -mt-1 text-white shadow-lg whitespace-nowrap w-max',
              getParticipantColor(cursor.name),
              cursor.chatActive && !isChatFaded ? 'px-3 py-2' : 'px-2 py-1',
            )}
            style={{
              borderRadius: cursor.chatActive && !isChatFaded ? '0 0.75rem 0.75rem 0.75rem' : '0.375rem',
              transition: 'border-radius 0.3s ease-out, padding 0.3s ease-out',
            }}
          >
            <div className="text-xs">{cursor.name}</div>

            {cursor.chatActive && (
              <div
                className="text-sm"
                style={{
                  opacity: isChatFading || isChatFaded ? 0 : 1,
                  transition: isChatFading ? 'opacity 3s ease-out' : 'opacity 0.1s ease-out',
                }}
              >
                {cursor.chatMessage || 'ㅤ'}
              </div>
            )}
          </div>
        </div>
      </Html>
    </Group>
  )
})

AnimatedCursor.displayName = 'AnimatedCursor'
