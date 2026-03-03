import { UserSessionStore } from './user-session.store'
import { UserSession } from './user'

// 리팩터링 전: O(N) 구현체
class LegacyUserSessionStore {
  private readonly connectedUsers = new Map<string, UserSession>()

  set(socketId: string, session: UserSession) {
    this.connectedUsers.set(socketId, session)
  }

  list() {
    return Array.from(this.connectedUsers.values())
  }

  // 전체를 순회하며 필터링 (느림)
  listByRoom(roomId: string) {
    return this.list().filter(s => s.roomId === roomId)
  }
}

describe('UserSessionStore Performance Benchmark', () => {
  let optimizedStore: UserSessionStore
  let legacyStore: LegacyUserSessionStore

  // 테스트 데이터 규모 설정
  const TOTAL_USERS = 100_000 // 10만 명 접속 가정
  const TOTAL_ROOMS = 1_000 // 1000개 방
  const TARGET_ROOM_ID = 'room-500' // 조회할 방 ID

  beforeAll(() => {
    optimizedStore = new UserSessionStore()
    legacyStore = new LegacyUserSessionStore()

    console.log(`\nGenerating ${TOTAL_USERS} users in ${TOTAL_ROOMS} rooms...`)

    for (let i = 0; i < TOTAL_USERS; i++) {
      const roomId = `room-${i % TOTAL_ROOMS}`
      const session = new UserSession(
        {
          socketId: `socket-${i}`,
          userId: `user-${i}`,
          name: `User ${i}`,
          roomId: roomId,
        },
        false,
      )

      optimizedStore.set(session.socketId, session)
      legacyStore.set(session.socketId, session)
    }
    console.log('Data generation complete.\n')
  })

  it('Benchmark listByRoom Performance', () => {
    const ITERATIONS = 1000 // 조회 반복 횟수

    // 1. Legacy (O(N)) 측정
    const startLegacy = process.hrtime()
    for (let i = 0; i < ITERATIONS; i++) {
      legacyStore.listByRoom(TARGET_ROOM_ID)
    }
    const endLegacy = process.hrtime(startLegacy)
    const timeLegacy = (endLegacy[0] * 1000 + endLegacy[1] / 1e6).toFixed(2)

    // 2. Optimized (O(1)) 측정
    const startOptimized = process.hrtime()
    for (let i = 0; i < ITERATIONS; i++) {
      optimizedStore.listByRoom(TARGET_ROOM_ID)
    }
    const endOptimized = process.hrtime(startOptimized)
    const timeOptimized = (endOptimized[0] * 1000 + endOptimized[1] / 1e6).toFixed(2)

    // 결과 출력
    console.log(`
    ========================================
    [Performance Result]
    Total Users: ${TOTAL_USERS.toLocaleString()}
    Total Rooms: ${TOTAL_ROOMS.toLocaleString()}
    Iterations:  ${ITERATIONS.toLocaleString()}

    Legacy (O(N)):    ${timeLegacy} ms
    Optimized (O(1)): ${timeOptimized} ms

    Improvement: ${(+timeLegacy / +timeOptimized).toFixed(1)}x faster
    ========================================
    `)

    // 최적화된 버전이 더 빨라야 함
    expect(+timeOptimized).toBeLessThan(+timeLegacy)
  })
})
