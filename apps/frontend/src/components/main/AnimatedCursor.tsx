import React, { useRef, useEffect } from 'react'
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
  }, [cursor.x, cursor.y]) // 컴포넌트 마운트 시 한 번만 실행

  const mockUserName = `User ${cursor.socketId.substring(0, 4)}`

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
          <CursorIcon className={`w-8 h-8 ${getCursorColor(mockUserName)} drop-shadow-md`} />

          {/* 사용자 이름 표시 (채팅 비활성화 시) */}
          {!cursor.chatActive && (
            <div className={`ml-5 -mt-1 px-2 py-1 ${getParticipantColor(mockUserName)} text-white text-xs rounded-md shadow-lg whitespace-nowrap`}>
              {mockUserName}
            </div>
          )}

          {/* 커서챗 말풍선 (채팅 활성화 시) */}
          {cursor.chatActive && (
            <div
              className={`ml-5 -mt-1 px-2 py-1 ${getParticipantColor(mockUserName)} text-white text-sm rounded-xl rounded-tl-none shadow-xl min-w-10 wrap-break-word max-w-[200px]`}
            >
              {cursor.chatMessage || 'ㅤ'}
            </div>
          )}
        </div>
      </Html>
    </Group>
  )
})

AnimatedCursor.displayName = 'AnimatedCursor'

export default AnimatedCursor
