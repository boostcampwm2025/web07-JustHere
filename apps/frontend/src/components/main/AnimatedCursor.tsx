import React, { useRef, useEffect } from 'react'
import { Circle, Text } from 'react-konva'
import Konva from 'konva'
import type { CursorPositionWithId } from '@/types/yjs.types'

interface AnimatedCursorProps {
  cursor: CursorPositionWithId
}

/**
 * 애니메이션이 적용된 커서 컴포넌트
 * requestAnimationFrame + Lerp을 사용하여 부드러운 추적 애니메이션 구현
 */
const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const circleRef = useRef<Konva.Circle>(null)
  const textRef = useRef<Konva.Text>(null)

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
    if (!circleRef.current || !textRef.current) return

    // 초기 위치 설정
    const initialX = cursor.x
    const initialY = cursor.y
    currentRef.current = { x: initialX, y: initialY }
    circleRef.current.x(initialX)
    circleRef.current.y(initialY)
    textRef.current.x(initialX + 12)
    textRef.current.y(initialY - 8)

    // Konva.Animation으로 부드러운 추적 애니메이션
    const animation = new Konva.Animation(() => {
      if (!circleRef.current || !textRef.current) return

      const current = currentRef.current
      const target = targetRef.current

      // Lerp (Linear Interpolation): 현재 위치에서 목표 위치로 20%씩 이동
      // lerp factor가 클수록 빠르게 따라감 (0.1 = 느림, 0.3 = 빠름)
      const lerpFactor = 0.2

      current.x += (target.x - current.x) * lerpFactor
      current.y += (target.y - current.y) * lerpFactor

      // 매우 가까워지면 정확히 목표 위치로 스냅
      const distance = Math.sqrt(Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2))
      if (distance < 0.5) {
        current.x = target.x
        current.y = target.y
      }

      // 위치 업데이트
      circleRef.current.x(current.x)
      circleRef.current.y(current.y)
      textRef.current.x(current.x + 12)
      textRef.current.y(current.y - 8)
    }, circleRef.current.getLayer())

    animation.start()
    animationRef.current = animation

    return () => {
      animation.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 컴포넌트 마운트 시 한 번만 실행, cursor.x/y는 targetRef로 추적

  return (
    <>
      {/* 커서 원 - x, y를 제거하여 Lerp 애니메이션만 위치 제어 */}
      <Circle ref={circleRef} radius={8} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
      {/* 사용자 ID 텍스트 - x, y를 제거하여 Lerp 애니메이션만 위치 제어 */}
      <Text ref={textRef} text={`User ${cursor.socketId.substring(0, 4)}`} fontSize={12} fill="#3b82f6" />
    </>
  )
})

AnimatedCursor.displayName = 'AnimatedCursor'

export default AnimatedCursor
