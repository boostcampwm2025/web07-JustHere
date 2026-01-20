import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Group } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { CursorInfoWithId } from '@/types/yjs.types'
import { CursorIcon } from '@/components/Icons'
import { getCursorColor, getParticipantColor } from '@/utils/participant'

interface AnimatedCursorProps {
  cursor: CursorInfoWithId
}

/**
 * 애니메이션이 적용된 커서 컴포넌트
 * requestAnimationFrame + Lerp을 사용하여 부드러운 추적 애니메이션 구현
 * 커서챗 활성화 시 말풍선 UI 표시
 */
const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const groupRef = useRef<Konva.Group>(null)

  // 목표 위치 저장
  const targetRef = useRef({ x: cursor.x, y: cursor.y })

  // 현재 위치 저장 (부드럽게 보간되는 위치)
  const currentRef = useRef({ x: cursor.x, y: cursor.y })

  // 애니메이션 객체 저장
  const animationRef = useRef<Konva.Animation | null>(null)

  // 커서챗 fade-out 관련 상태
  const [isChatFading, setIsChatFading] = useState(false)
  const [isChatFaded, setIsChatFaded] = useState(false) // fade 완료 상태 (이름표로 전환)
  const chatInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChatMessageRef = useRef(cursor.chatMessage)

  // fade-out 완전 비활성화 함수
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

  // fade-out 애니메이션 시작 함수
  const startFadeOut = useCallback(() => {
    setIsChatFading(true)
    // 3초간 fade-out 애니메이션 후 이름표로 전환
    chatFadeTimerRef.current = setTimeout(() => {
      setIsChatFading(false) // fading 완료
      setIsChatFaded(true) // 높이 축소 애니메이션 시작
      chatFadeTimerRef.current = null
    }, 3000)
  }, [])

  // 비활성화 타이머 리셋 (3초 후 fade-out 시작)
  const resetInactivityTimer = useCallback(() => {
    // 기존 타이머들 정리
    if (chatInactivityTimerRef.current) {
      clearTimeout(chatInactivityTimerRef.current)
    }
    if (chatFadeTimerRef.current) {
      clearTimeout(chatFadeTimerRef.current)
      chatFadeTimerRef.current = null
    }
    // fade-out 중이었다면 즉시 다시 활성화 (opacity 복구)
    setIsChatFading(false)
    setIsChatFaded(false)

    // 3초 후 fade-out 시작
    chatInactivityTimerRef.current = setTimeout(() => {
      startFadeOut()
    }, 3000)
  }, [startFadeOut])

  // chatMessage가 변경될 때마다 타이머 리셋
  useEffect(() => {
    if (cursor.chatActive) {
      // 메시지가 실제로 변경되었을 때만 타이머 리셋
      if (prevChatMessageRef.current !== cursor.chatMessage) {
        prevChatMessageRef.current = cursor.chatMessage
        resetInactivityTimer()
      }
    } else {
      // 채팅 비활성화 시 타이머 정리
      deactivateFade()
    }
  }, [cursor.chatActive, cursor.chatMessage, resetInactivityTimer, deactivateFade])

  // 컴포넌트 언마운트 시 타이머 정리
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
    // 목표 위치 업데이트
    targetRef.current = { x: cursor.x, y: cursor.y }
  }, [cursor.x, cursor.y])

  useEffect(() => {
    if (!groupRef.current) return

    // 초기 위치 설정
    const initialX = cursor.x
    const initialY = cursor.y
    currentRef.current = { x: initialX, y: initialY }
    groupRef.current.x(initialX)
    groupRef.current.y(initialY)

    // Konva.Animation으로 부드러운 추적 애니메이션
    const animation = new Konva.Animation(() => {
      if (!groupRef.current) return

      const current = currentRef.current
      const target = targetRef.current

      // Lerp (Linear Interpolation): 현재 위치에서 목표 위치로 20%씩 이동
      const lerpFactor = 0.2

      current.x += (target.x - current.x) * lerpFactor
      current.y += (target.y - current.y) * lerpFactor

      // 매우 가까워지면 정확히 목표 위치로 스냅
      const distance = Math.sqrt(Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2))
      if (distance < 0.5) {
        current.x = target.x
        current.y = target.y
      }

      // 그룹 위치 업데이트 (하위 요소들은 상대 좌표)
      groupRef.current.x(current.x)
      groupRef.current.y(current.y)
    }, groupRef.current.getLayer())

    animation.start()
    animationRef.current = animation

    return () => {
      animation.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  return (
    <Group ref={groupRef}>
      <Html
        divProps={{
          style: {
            pointerEvents: 'none',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          },
        }}
      >
        <div className="relative flex flex-col items-start overflow-visible">
          <CursorIcon className={`w-8 h-8 ${getCursorColor(cursor.name)} drop-shadow-md`} />

          {/* 통합된 이름표/커서챗 말풍선 */}
          <div
            className={`ml-5 -mt-1 ${cursor.chatActive && !isChatFaded ? 'px-3 py-2' : 'px-2 py-1'} ${getParticipantColor(cursor.name)} text-white shadow-lg whitespace-nowrap`}
            style={{
              borderRadius: cursor.chatActive && !isChatFaded ? '0 0.75rem 0.75rem 0.75rem' : '0.375rem',
              transition: 'border-radius 0.3s ease-out, padding 0.3s ease-out',
            }}
          >
            {/* 이름 (항상 표시) */}
            <div className="text-xs">{cursor.name}</div>

            {/* 메시지 텍스트 (채팅 활성화 시에만, fade-out 및 높이 축소 적용) */}
            {cursor.chatActive && (
              <div
                className="text-sm wrap-break-word max-w-[200px] overflow-hidden"
                style={{
                  opacity: isChatFading || isChatFaded ? 0 : 1,
                  // maxHeight: isChatFaded ? 0 : '200px',
                  transition: isChatFading ? 'opacity 3s ease-out, max-height 0.3s ease-out 3s' : 'opacity 0.1s ease-out, max-height 0.3s ease-out',
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

export default AnimatedCursor
