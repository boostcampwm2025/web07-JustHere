import React, { useRef, useEffect } from 'react'
import { Text, Group, Rect } from 'react-konva'
import { Html } from 'react-konva-utils'
import Konva from 'konva'
import type { CursorInfoWithId } from '@/types/yjs.types'
import { CursorIcon } from '../Icons'

interface AnimatedCursorProps {
  cursor: CursorInfoWithId
}

// 말풍선 패딩 및 스타일 상수
const CHAT_BUBBLE_PADDING_X = 10
const CHAT_BUBBLE_PADDING_Y = 6
const CHAT_BUBBLE_OFFSET_X = 15
const CHAT_BUBBLE_OFFSET_Y = -25
const CHAT_BUBBLE_FONT_SIZE = 13
const CHAT_BUBBLE_CORNER_RADIUS = 8

/**
 * 애니메이션이 적용된 커서 컴포넌트
 * requestAnimationFrame + Lerp을 사용하여 부드러운 추적 애니메이션 구현
 * 커서챗 활성화 시 말풍선 UI 표시
 */
const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const groupRef = useRef<Konva.Group>(null)
  const textRef = useRef<Konva.Text>(null)
  const chatGroupRef = useRef<Konva.Group>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // 말풍선 텍스트 너비 계산
  const chatMessage = cursor.chatMessage || ''
  const estimatedTextWidth = chatMessage.length * CHAT_BUBBLE_FONT_SIZE * 0.6
  const bubbleWidth = Math.max(estimatedTextWidth + CHAT_BUBBLE_PADDING_X * 2, 40)

  return (
    <Group ref={groupRef}>
      {/* 커서 원 */}
      <Html>
        <div className="w-16 h-16">
          <CursorIcon />
        </div>
      </Html>

      {/* 사용자 ID 텍스트 */}
      <Text ref={textRef} x={12} y={-8} text={`User ${cursor.socketId.substring(0, 4)}`} fontSize={12} fill="#3b82f6" />

      {/* 커서챗 말풍선 */}
      {cursor.chatActive && (
        <Group ref={chatGroupRef} x={CHAT_BUBBLE_OFFSET_X} y={CHAT_BUBBLE_OFFSET_Y}>
          {/* 말풍선 배경 */}
          <Rect
            width={bubbleWidth}
            height={CHAT_BUBBLE_FONT_SIZE + CHAT_BUBBLE_PADDING_Y * 2}
            fill="#3b82f6"
            cornerRadius={CHAT_BUBBLE_CORNER_RADIUS}
            shadowColor="black"
            shadowBlur={4}
            shadowOpacity={0.2}
            shadowOffsetY={2}
          />
          {/* 말풍선 텍스트 */}
          <Text x={CHAT_BUBBLE_PADDING_X} y={CHAT_BUBBLE_PADDING_Y} text={chatMessage || '...'} fontSize={CHAT_BUBBLE_FONT_SIZE} fill="#ffffff" />
        </Group>
      )}
    </Group>
  )
})

AnimatedCursor.displayName = 'AnimatedCursor'

export default AnimatedCursor
