# 커서 움직임 최적화 계획

## 현재 문제점

### 1. 네트워크 오버헤드
- `handleMouseMove`에서 마우스 이동마다 `updateCursor()` 호출
- 초당 60fps = 60번의 소켓 이벤트 발생
- 네트워크 요청 폭증으로 서버/클라이언트 부하

### 2. 리렌더링 문제
- `y:awareness` 이벤트 수신 시마다 `setCursors()` 호출
- 다른 사용자가 마우스 움직일 때마다 전체 컴포넌트 리렌더링
- 불필요한 React 리렌더링 사이클

### 3. 커서 움직임 끊김
- 쓰로틀링 후 업데이트 간격이 길어지면 커서가 순간이동하는 것처럼 보임
- 부드러운 애니메이션 없이 위치만 변경

## 해결 방안

참고 자료:
- [How to animate multiplayer cursors | Liveblocks](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors)
- [perfect-cursors: Perfect interpolation for multiplayer cursors](https://github.com/steveruizok/perfect-cursors)

### 1. 송신 최적화: 쓰로틀링 + 타임스탬프

**전략**: 마우스 이동 시 즉시 전송하지 않고, 100ms마다 배치로 전송

```typescript
// 클라이언트: 100ms마다 마지막 커서 위치 전송
const throttledUpdateCursor = useCallback(
  throttle((x: number, y: number) => {
    if (socketRef.current?.connected) {
      const awarenessPayload: YjsAwarenessPayload = {
        canvasId,
        state: {
          cursor: { x, y, timestamp: Date.now() },
        },
      }
      socketRef.current.emit('y:awareness', awarenessPayload)
    }
  }, 100), // 100ms 쓰로틀
  []
)
```

**장점**:
- 초당 60회 → 10회로 네트워크 요청 83% 감소
- 타임스탬프로 나중에 보간(interpolation) 가능

### 2. 수신 최적화: CSS Transition 기반 보간

**전략**: 쓰로틀링으로 끊어진 커서 움직임을 CSS transition으로 부드럽게 연결

```tsx
// 커서 렌더링 시 CSS transition 적용
<Circle
  x={cursor.x}
  y={cursor.y}
  radius={8}
  fill="#3b82f6"
  style={{
    transition: 'all 0.1s linear', // 100ms 선형 애니메이션
  }}
/>
```

**선택 이유**:
- **CSS Transition (채택)**: 가장 간단하고 가벼움, linear timing으로 일정한 속도 유지
- **Spring Animation**: 부드럽지만 물리 연산 오버헤드, 라이브러리 필요
- **Spline Interpolation (perfect-cursors)**: 정확한 경로 추적하지만 지연 발생

업데이트 간격이 100ms로 짧기 때문에 CSS transition만으로 충분히 부드러운 효과 가능

### 3. 리렌더링 최적화

**전략 1**: `useMemo`로 커서 렌더링 메모이제이션
```typescript
const cursorElements = useMemo(() => {
  return Array.from(cursors.values()).map(cursor => (
    <CursorComponent key={cursor.socketId} cursor={cursor} />
  ))
}, [cursors])
```

**전략 2**: 커서 컴포넌트를 `React.memo`로 최적화
```typescript
const CursorComponent = React.memo(({ cursor }: { cursor: CursorPositionWithId }) => {
  return (
    <>
      <Circle x={cursor.x} y={cursor.y} radius={8} fill="#3b82f6" />
      <Text x={cursor.x + 12} y={cursor.y - 8} text={`User ${cursor.socketId.substring(0, 4)}`} />
    </>
  )
})
```

## 구현 계획

### Phase 1: 송신 쓰로틀링
1. `lodash.throttle` 또는 커스텀 쓰로틀 함수 구현
2. `useYjsSocket.ts`의 `updateCursor()` 함수를 쓰로틀링 버전으로 변경
3. 타임스탬프 추가 (선택 사항, 나중에 고급 보간 시 활용)

### Phase 2: 수신 보간 (CSS Transition)
1. Konva의 Circle/Text에 `listening` 속성과 CSS transition 적용
2. 실제로는 Konva는 Canvas 기반이므로 **Konva Tween** 사용
3. 새 위치 수신 시 `cursor.to({ x, y, duration: 0.1 })` 애니메이션

### Phase 3: 리렌더링 최적화
1. 커서 렌더링 로직을 별도 컴포넌트로 분리
2. `React.memo` 적용
3. `useMemo`로 커서 리스트 메모이제이션

### Phase 4: 타입 정의 업데이트
1. `CursorPosition` 인터페이스에 `timestamp?: number` 추가
2. 백엔드 DTO도 동일하게 업데이트 (선택 사항)

## 예상 성능 개선

| 지표 | 현재 | 최적화 후 | 개선율 |
|-----|------|----------|--------|
| 네트워크 요청 | 60/s | 10/s | 83% ↓ |
| 리렌더링 | 60/s | 10/s + 메모이제이션 | 90% ↓ |
| 커서 부드러움 | 끊김 | Tween 애니메이션 | 매끄러움 |

## Konva Tween API

Konva는 Canvas 기반이므로 CSS를 직접 사용할 수 없습니다. 대신 **Konva.Tween**을 사용합니다.

```typescript
import Konva from 'konva'

// Circle ref 생성
const circleRef = useRef<Konva.Circle>(null)

// 새 위치 수신 시 애니메이션
useEffect(() => {
  if (circleRef.current) {
    const tween = new Konva.Tween({
      node: circleRef.current,
      x: cursor.x,
      y: cursor.y,
      duration: 0.1, // 100ms
      easing: Konva.Easings.Linear, // 선형 이동
    })
    tween.play()
  }
}, [cursor.x, cursor.y])
```

## 대안: react-spring 사용

Konva Tween이 복잡하다면 `react-spring` + `react-konva` 통합도 가능:
```typescript
import { useSpring, animated } from '@react-spring/konva'

const AnimatedCircle = animated(Circle)

const [spring, api] = useSpring(() => ({ x: 0, y: 0 }))

useEffect(() => {
  api.start({ x: cursor.x, y: cursor.y, config: { duration: 100 } })
}, [cursor.x, cursor.y])

return <AnimatedCircle x={spring.x} y={spring.y} radius={8} />
```

## 참고 자료

- [How to animate multiplayer cursors | Liveblocks blog](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors)
- [perfect-cursors: Perfect interpolation for multiplayer cursors](https://github.com/steveruizok/perfect-cursors)
- [Building Figma Multiplayer Cursors](https://mskelton.dev/blog/building-figma-multiplayer-cursors)
- [Konva Tween Documentation](https://konvajs.org/docs/tweens/Common_Easings.html)
