# 부드러운 커서 애니메이션 구현

## 문제점 분석

### 초기 구현의 문제

**1차 구현 (Konva Tween)**:
```typescript
useEffect(() => {
  const tween = new Konva.Tween({
    node: circleRef.current,
    x: cursor.x,
    y: cursor.y,
    duration: 0.1, // 100ms
    easing: Konva.Easings.Linear,
  })
  tween.play()
}, [cursor.x, cursor.y])
```

**문제점**:
1. ❌ **매번 새 Tween 생성**: 이전 애니메이션 중단, 끊김 발생
2. ❌ **고정된 duration**: 짧은 거리도 100ms 소요, 부자연스러움
3. ❌ **Linear easing**: 가속/감속 없이 기계적인 느낌
4. ❌ **100ms마다 순간이동**: 쓰로틀링 간격이 그대로 보임

### 사용자 피드백

> "최적화는 되었는데 내가 원하는 느낌이 아니야. 지금은 그냥 단순히 100ms씩 나뉘어져서 보내지는 느낌인데 이거말고 좀 더 부드럽게 움직이게 하고 싶어."

## 해결 방법: Lerp + requestAnimationFrame

### 핵심 아이디어

업데이트를 받을 때마다 **즉시 이동하지 않고**, 현재 위치에서 목표 위치로 **조금씩 따라가는** 애니메이션을 구현합니다.

참고:
- [Smooth Cursor Animation with Lerp](https://medium.com/14islands/developing-a-performant-custom-cursor-89f1688a02eb)
- [Understanding Linear Interpolation](https://thelinuxcode.com/understanding-linear-interpolation-for-smooth-animations/)

### Linear Interpolation (Lerp) 공식

```typescript
current = current + (target - current) * lerpFactor
```

- `lerpFactor = 0.1`: 매 프레임마다 남은 거리의 10%씩 이동 (느림)
- `lerpFactor = 0.2`: 매 프레임마다 남은 거리의 20%씩 이동 (적당)
- `lerpFactor = 0.5`: 매 프레임마다 남은 거리의 50%씩 이동 (빠름)

**특징**:
- 목표에 가까울수록 속도가 느려짐 (자연스러운 감속)
- 목표에서 멀수록 속도가 빠름 (자동 가속)
- 부드러운 easing 효과 자동 생성

## 최종 구현

### AnimatedCursor 컴포넌트

**파일**: [apps/frontend/src/components/main/AnimatedCursor.tsx](../apps/frontend/src/components/main/AnimatedCursor.tsx)

```typescript
const AnimatedCursor = React.memo(({ cursor }: AnimatedCursorProps) => {
  const circleRef = useRef<Konva.Circle>(null)
  const textRef = useRef<Konva.Text>(null)

  // 목표 위치 (소켓에서 받은 최신 위치)
  const targetRef = useRef({ x: cursor.x, y: cursor.y })

  // 현재 위치 (부드럽게 보간되는 위치)
  const currentRef = useRef({ x: cursor.x, y: cursor.y })

  // 애니메이션 객체
  const animationRef = useRef<Konva.Animation | null>(null)

  // 목표 위치 업데이트 (100ms마다 새 위치 수신)
  useEffect(() => {
    targetRef.current = { x: cursor.x, y: cursor.y }
  }, [cursor.x, cursor.y])

  // 애니메이션 초기화 (마운트 시 한 번만)
  useEffect(() => {
    if (!circleRef.current || !textRef.current) return

    // 초기 위치 설정
    const initialX = cursor.x
    const initialY = cursor.y
    currentRef.current = { x: initialX, y: initialY }

    // Konva.Animation으로 매 프레임마다 실행
    const animation = new Konva.Animation(() => {
      if (!circleRef.current || !textRef.current) return

      const current = currentRef.current
      const target = targetRef.current

      // Lerp: 현재 위치에서 목표 위치로 20%씩 이동
      const lerpFactor = 0.2

      current.x += (target.x - current.x) * lerpFactor
      current.y += (target.y - current.y) * lerpFactor

      // 매우 가까워지면 정확히 목표 위치로 스냅
      const distance = Math.sqrt(
        Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2)
      )
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
  }, [])

  return (
    <>
      <Circle ref={circleRef} x={cursor.x} y={cursor.y} radius={8} fill="#3b82f6" />
      <Text ref={textRef} x={cursor.x + 12} y={cursor.y - 8} text={`User ${cursor.socketId}`} />
    </>
  )
})
```

## 동작 원리

### 1. 이중 위치 추적

```
targetRef (목표)    ──→ 소켓에서 100ms마다 업데이트
                         ▼
currentRef (현재)   ──→ 매 프레임(60fps)마다 Lerp로 따라감
```

### 2. 타임라인

```
0ms   : 소켓 수신 (x:100) → target = 100, current = 0
16ms  : Lerp 실행 → current = 0 + (100-0)*0.2 = 20
32ms  : Lerp 실행 → current = 20 + (100-20)*0.2 = 36
48ms  : Lerp 실행 → current = 36 + (100-36)*0.2 = 48.8
64ms  : Lerp 실행 → current = 48.8 + (100-48.8)*0.2 = 59.04
80ms  : Lerp 실행 → current = 59.04 + (100-59.04)*0.2 = 67.23
96ms  : Lerp 실행 → current = 67.23 + (100-67.23)*0.2 = 73.78
100ms : 소켓 수신 (x:200) → target = 200, current = 73.78
116ms : Lerp 실행 → current = 73.78 + (200-73.78)*0.2 = 99.02
...
```

**결과**: 100ms마다 받는 업데이트 사이를 60fps로 부드럽게 연결

### 3. Konva.Animation의 장점

- **자동 requestAnimationFrame**: 매 프레임마다 콜백 실행
- **Layer 통합**: layer.draw() 자동 호출
- **성능 최적화**: Konva의 렌더링 파이프라인 활용

## 성능 비교

| 방법 | FPS | 부드러움 | CPU 사용량 | 특징 |
|-----|-----|---------|----------|------|
| Tween (이전) | 10 updates/s | ⭐⭐ 끊김 | 낮음 | 100ms마다 순간이동 |
| Lerp (현재) | 60 fps | ⭐⭐⭐⭐⭐ 매우 부드러움 | 중간 | 자연스러운 추적 |

## Lerp Factor 조정 가이드

```typescript
const lerpFactor = 0.2 // 조정 가능
```

| lerpFactor | 속도 | 느낌 | 사용 케이스 |
|-----------|------|------|-----------|
| 0.1 | 느림 | 부드럽지만 지연 느낌 | 여유로운 애니메이션 |
| 0.2 | 적당 | **균형잡힌 부드러움 (권장)** | 일반적인 커서 |
| 0.3 | 빠름 | 반응적이지만 덜 부드러움 | 빠른 반응 필요 시 |
| 0.5 | 매우 빠름 | 거의 즉시 도달 | 실시간성 중요 시 |

**권장값**: `0.2` - 부드러움과 반응성의 최적 균형

## 최종 결과

### Before (Tween)
```
100ms 간격으로 끊어지는 움직임:
[위치A] ──100ms──> [위치B] ──100ms──> [위치C]
        순간이동        순간이동
```

### After (Lerp)
```
60fps로 부드럽게 추적:
[위치A] ~~~자연스러운 곡선~~~> [위치B] ~~~자연스러운 곡선~~~> [위치C]
        16ms  16ms  16ms  16ms         16ms  16ms  16ms  16ms
```

### 체감 효과

- ✅ **부드러운 추적**: 목표 위치를 쫓아가는 자연스러운 움직임
- ✅ **자동 easing**: 가까워질수록 느려지는 감속 효과
- ✅ **높은 FPS**: 60fps로 실행되어 매우 부드러움
- ✅ **네트워크 최적화 유지**: 여전히 100ms마다만 전송

## 중요: React Props vs Ref 충돌 문제

### 문제 상황

**잘못된 코드** (커서가 튀는 현상):
```tsx
return (
  <>
    <Circle ref={circleRef} x={cursor.x} y={cursor.y} radius={8} />  {/* ❌ 문제 */}
    <Text ref={textRef} x={cursor.x + 12} y={cursor.y - 8} text="..." />  {/* ❌ 문제 */}
  </>
)
```

**문제 원인**:
1. Lerp 애니메이션이 `circleRef.current.x(current.x)`로 부드럽게 위치 업데이트 중
2. 새 커서 위치 수신 → React 리렌더링 발생
3. JSX의 `x={cursor.x}, y={cursor.y}` prop이 **Lerp 계산 결과를 덮어씀**
4. 결과: 부드러운 애니메이션 무시 → 즉각 새 위치로 점프 (튀는 현상)

**타임라인**:
```
0ms   : Lerp 애니메이션 실행 중 (current.x = 50)
16ms  : Lerp 업데이트 (current.x = 60)
32ms  : Lerp 업데이트 (current.x = 68)
48ms  : 새 커서 위치 수신 (cursor.x = 200)
        ↓ React 리렌더링
        ↓ JSX prop이 x=200으로 강제 설정
        ↓ current.x = 68 무시됨
        ↓ 즉각 200으로 점프! (튀는 현상)
```

### 해결 방법

**올바른 코드** (부드러운 애니메이션):
```tsx
return (
  <>
    {/* x, y prop 제거 - 오직 ref를 통한 명령형 업데이트만 사용 */}
    <Circle ref={circleRef} radius={8} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
    <Text ref={textRef} text={`User ${cursor.socketId}`} fontSize={12} fill="#3b82f6" />
  </>
)
```

**핵심 원칙**:
- ✅ **명령형 애니메이션**: `ref.current.x()`, `ref.current.y()`로 위치 제어
- ❌ **선언형 Props 금지**: JSX의 `x`, `y` prop 사용 금지 (리렌더링 시 충돌)

이렇게 하면 Lerp 애니메이션이 **유일한 위치 제어 메커니즘**이 되어 튀는 현상이 사라집니다.

## 추가 개선 가능 영역

### 1. 속도 기반 Lerp Factor

빠르게 움직일 때는 더 빠르게 따라가도록:

```typescript
const distance = Math.sqrt(
  Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2)
)

// 거리에 따라 동적으로 lerp factor 조정
const lerpFactor = distance > 100 ? 0.3 : 0.2
```

### 2. Spring Physics

물리 기반 애니메이션 (라이브러리 필요):

```typescript
import { useSpring, animated } from '@react-spring/konva'

const [spring, api] = useSpring(() => ({ x: 0, y: 0 }))

useEffect(() => {
  api.start({ x: cursor.x, y: cursor.y, config: { tension: 300, friction: 20 } })
}, [cursor.x, cursor.y])
```

### 3. 예측 알고리즘

마우스 속도와 방향을 분석하여 다음 위치 예측:

```typescript
const velocity = {
  x: (target.x - prevTarget.x) / deltaTime,
  y: (target.y - prevTarget.y) / deltaTime,
}

const predictedTarget = {
  x: target.x + velocity.x * 0.05, // 50ms 예측
  y: target.y + velocity.y * 0.05,
}
```

## 참고 자료

- [Developing a performant custom cursor | Medium](https://medium.com/14islands/developing-a-performant-custom-cursor-89f1688a02eb)
- [Understanding Linear Interpolation | TheLinuxCode](https://thelinuxcode.com/understanding-linear-interpolation-for-smooth-animations/)
- [Konva Animation System | Konva.js](https://konvajs.org/docs/performance/Optimize_Animation.html)
- [How to animate multiplayer cursors | Liveblocks](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors)
