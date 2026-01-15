# 커서 움직임 최적화 구현 완료

## 구현 개요

커서 움직임의 네트워크 요청과 리렌더링을 최적화하고, 쓰로틀링으로 인한 끊김을 Konva Tween 애니메이션으로 해결했습니다.

## 구현 내용

### 1. 송신 최적화: Throttle 유틸리티 (100ms)

**파일**: [apps/frontend/src/utils/throttle.ts](../apps/frontend/src/utils/throttle.ts)

```typescript
export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= delay) {
      lastCall = now
      func(...args)
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(
        () => {
          lastCall = Date.now()
          func(...args)
        },
        delay - timeSinceLastCall,
      )
    }
  }) as T
}
```

**특징**:
- 마지막 호출 후 `delay`ms 이상 경과 시 즉시 실행
- 그렇지 않으면 남은 시간 후 실행 예약
- 이전 예약을 취소하고 새로 예약하여 최신 값만 전송

### 2. useYjsSocket에 쓰로틀링 적용

**파일**: [apps/frontend/src/hooks/useYjsSocket.ts](../apps/frontend/src/hooks/useYjsSocket.ts)

```typescript
// 커서 위치 업데이트 함수 (쓰로틀링 적용: 100ms마다 최대 1회)
const updateCursorThrottled = useRef(
  throttle((canvasId: string, socketRef: React.MutableRefObject<Socket | null>, x: number, y: number) => {
    if (socketRef.current?.connected) {
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: {
          cursor: { x, y },
        },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
    }
  }, 100),
).current

const updateCursor = useCallback(
  (x: number, y: number) => {
    updateCursorThrottled(canvasId, socketRef, x, y)
  },
  [canvasId, updateCursorThrottled],
)
```

**결과**: 초당 60회 → 10회로 네트워크 요청 **83% 감소**

### 3. 타입 정의에 timestamp 추가

**파일**:
- [apps/frontend/src/types/yjs.types.ts](../apps/frontend/src/types/yjs.types.ts)
- [apps/backend/src/yjs/dto/yjs.dto.ts](../apps/backend/src/yjs/dto/yjs.dto.ts)

```typescript
export interface CursorPosition {
  x: number
  y: number
  timestamp?: number // 커서 위치 업데이트 시간 (ms)
}
```

**용도**: 향후 더 정교한 보간 알고리즘(spline interpolation) 구현 시 활용 가능

### 4. AnimatedCursor 컴포넌트 (Konva Tween 보간)

**파일**: [apps/frontend/src/components/main/AnimatedCursor.tsx](../apps/frontend/src/components/main/AnimatedCursor.tsx)

```typescript
const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const circleRef = useRef<Konva.Circle>(null)
  const textRef = useRef<Konva.Text>(null)

  useEffect(() => {
    // 커서 위치가 변경될 때마다 Tween 애니메이션 실행
    if (circleRef.current) {
      const tween = new Konva.Tween({
        node: circleRef.current,
        x: cursor.x,
        y: cursor.y,
        duration: 0.1, // 100ms 애니메이션
        easing: Konva.Easings.Linear, // 선형 이동
      })
      tween.play()
    }

    if (textRef.current) {
      const tween = new Konva.Tween({
        node: textRef.current,
        x: cursor.x + 12,
        y: cursor.y - 8,
        duration: 0.1,
        easing: Konva.Easings.Linear,
      })
      tween.play()
    }
  }, [cursor.x, cursor.y])

  return (
    <>
      <Circle ref={circleRef} x={cursor.x} y={cursor.y} radius={8} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
      <Text
        ref={textRef}
        x={cursor.x + 12}
        y={cursor.y - 8}
        text={`User ${cursor.socketId.substring(0, 4)}`}
        fontSize={12}
        fill="#3b82f6"
      />
    </>
  )
})
```

**핵심 기술**:
- **Konva.Tween**: Canvas 기반 부드러운 애니메이션
- **duration: 0.1초**: 쓰로틀링 간격(100ms)과 동일하게 설정하여 자연스러운 연결
- **Easings.Linear**: 일정한 속도로 이동 (가속/감속 없음)
- **React.memo**: props 변경 시에만 리렌더링

**결과**: 쓰로틀링으로 끊어진 커서 위치 업데이트 사이를 부드러운 애니메이션으로 연결

### 5. WhiteboardCanvas 수정

**파일**: [apps/frontend/src/components/main/WhiteboardCanvas.tsx](../apps/frontend/src/components/main/WhiteboardCanvas.tsx)

**변경 전**:
```tsx
{Array.from(cursors.values()).map(cursor => (
  <React.Fragment key={cursor.socketId}>
    <Circle x={cursor.x} y={cursor.y} radius={8} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
    <Text x={cursor.x + 12} y={cursor.y - 8} text={`User ${cursor.socketId.substring(0, 4)}`} />
  </React.Fragment>
))}
```

**변경 후**:
```tsx
{Array.from(cursors.values()).map(cursor => (
  <AnimatedCursor key={cursor.socketId} cursor={cursor} />
))}
```

## 성능 개선 결과

| 지표 | 최적화 전 | 최적화 후 | 개선율 |
|-----|---------|----------|--------|
| 네트워크 요청 | 60회/초 | 10회/초 | **83% ↓** |
| 소켓 이벤트 전송 | 매 마우스 이동마다 | 100ms마다 | **83% ↓** |
| 커서 부드러움 | 순간이동 (끊김) | Tween 애니메이션 | **매끄러움** |
| 리렌더링 최적화 | 매번 전체 렌더링 | React.memo로 필요 시만 | **최적화** |

## 기술적 선택 이유

### 1. Throttle 간격: 100ms

- **너무 짧으면 (50ms)**: 네트워크 부하 여전히 높음
- **너무 길면 (200ms)**: 커서가 너무 느리게 따라옴
- **100ms**: 초당 10회, 사람 눈에 자연스러운 업데이트 주기

### 2. Konva Tween (선형 이동)

**다른 방법들과 비교**:
- ❌ **CSS Transition**: Konva는 Canvas 기반이라 사용 불가
- ✅ **Konva Tween**: Canvas에서 부드러운 애니메이션 제공
- ⚠️ **Spring Animation**: 물리 기반 자연스러움, 하지만 오버헤드와 예측 불가능성
- ⚠️ **Spline Interpolation**: 정확한 경로 추적, 하지만 지연 발생 (여러 포인트 필요)

**선택 이유**:
- 100ms 간격이 짧아서 선형 이동만으로 충분히 부드러움
- 추가 라이브러리 불필요
- 예측 가능한 동작

### 3. React.memo

- 커서의 x, y 좌표가 변경될 때만 해당 커서 컴포넌트만 리렌더링
- 다른 커서나 캔버스 요소에 영향 없음

## 향후 개선 가능 영역

### 1. Spline Interpolation (고급 보간)

현재는 선형 이동이지만, 더 정교한 경로 추적을 원한다면:
- [perfect-cursors](https://github.com/steveruizok/perfect-cursors) 라이브러리 활용
- `timestamp` 필드 활용하여 여러 포인트 기반 곡선 생성
- 트레이드오프: 약간의 지연 발생

### 2. Awareness 상태 관리

현재는 메모리 브로드캐스트만 수행:
- 서버 메모리에 캐시하여 새 참여자도 기존 커서 볼 수 있도록
- 사용자가 나갔을 때 명확하게 제거

### 3. 적응형 쓰로틀링

네트워크 상태에 따라 동적으로 쓰로틀링 간격 조정:
- 좋은 네트워크: 50ms
- 나쁜 네트워크: 200ms

## 참고 자료

- [How to animate multiplayer cursors | Liveblocks blog](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors)
- [perfect-cursors: Perfect interpolation for multiplayer cursors](https://github.com/steveruizok/perfect-cursors)
- [Konva Tween Documentation](https://konvajs.org/docs/tweens/Common_Easings.html)
- [Building Figma Multiplayer Cursors](https://mskelton.dev/blog/building-figma-multiplayer-cursors)
