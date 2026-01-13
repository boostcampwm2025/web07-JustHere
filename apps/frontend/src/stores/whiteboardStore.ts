import { create } from 'zustand'
import * as Y from 'yjs'
import { io, Socket } from 'socket.io-client'

export interface Shape {
  id: string
  type: 'rect'
  x: number
  y: number
  color: string
}

interface WhiteboardState {
  shapes: Shape[]
  isConnected: boolean

  // roomId와 categoryId를 인자로 받음
  connect: (roomId: string, categoryId: string) => void
  disconnect: () => void
  addRect: (x?: number, y?: number) => void
  updateShapePosition: (id: string, x: number, y: number) => void
}

// 전역 변수로 선언하되, connect 시점에 재할당할 수 있도록 let 사용
let doc: Y.Doc | null = null
let yShapes: Y.Map<Shape> | null = null
let socket: Socket | null = null

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  shapes: [],
  isConnected: false,

  connect: (roomId: string, categoryId: string) => {
    // 1. 기존 연결 정리
    if (socket) socket.disconnect()
    if (doc) doc.destroy() // 기존 Y.js 문서 폐기 (메모리 해제)

    // 2. 새로운 Y.Doc 및 Socket 생성 (독립적인 캔버스 시작)
    doc = new Y.Doc()
    yShapes = doc.getMap<Shape>('shapes')

    // 소켓 연결 (네임스페이스나 쿼리로 ID를 넘길 수도 있음)
    socket = io('http://localhost:3000')

    // 3. 서버 이벤트 리스너 등록
    socket.on('connect', () => {
      console.log(`Socket connected: ${socket?.id}`)
      // 연결 직후 해당 카테고리 방 입장
      socket?.emit('join_category', { roomId, categoryId })
    })

    // 새로고침 시 최신화된 화면을 불러오기 위해 DB에 저장된 초기 데이터 불러오기
    // 즉, 초기 데이터 로드 (DB Snapshot + Logs)
    // TODO: 서버 측에서 특정 카테고리의 최신 데이터 가져오는 로직 필요
    socket.on('load_initial_data', (data: ArrayBuffer) => {
      if (doc) {
        console.log('Loading initial data form DB...')
        // 바이너리 데이터를 현재 문서에 병합
        Y.applyUpdate(doc, new Uint8Array(data))

        // 상태 강제 업데이트 (화면 갱신)
        if (yShapes) {
          set({ shapes: Array.from(yShapes.values()) })
        }
      }
    })

    // 실시간 업데이트 수신
    socket.on('yjs_update', (update: Uint8Array) => {
      if (doc) {
        Y.applyUpdate(doc, new Uint8Array(update))
      }
    })

    // 변경사항을 방 내 다른 참여자들에게 전송
    doc.on('update', (update: Uint8Array) => {
      if (socket && socket.connected) {
        socket.emit('yjs_update', { roomId, categoryId, update })
      }
    })

    // Y.js 데이터 변경 감지 -> Zustand 상태 업데이트
    yShapes.observe(() => {
      if (yShapes) {
        set({ shapes: Array.from(yShapes.values()) })
      }
    })

    set({ isConnected: true })
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    if (doc) {
      doc.destroy()
      doc = null
    }
    yShapes = null
    set({ isConnected: false, shapes: [] }) // 상태 초기화
  },

  addRect: (x?: number, y?: number) => {
    if (!yShapes || !doc) return

    const id = crypto.randomUUID()
    const newShape: Shape = {
      id,
      type: 'rect',
      // [변경] 인자가 있으면 그 위치 사용, 없으면 랜덤 (기존 로직 유지)
      x: x ?? Math.random() * 200,
      y: y ?? Math.random() * 200,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    }

    doc.transact(() => {
      yShapes?.set(id, newShape)
    })
  },

  updateShapePosition: (id, x, y) => {
    if (!yShapes || !doc) return

    const shape = yShapes.get(id)
    if (shape) {
      doc.transact(() => {
        yShapes?.set(id, { ...shape, x, y })
      })
    }
  },
}))
