import { Test, TestingModule } from '@nestjs/testing'
import { CanvasGateway } from './canvas.gateway'
import { YjsService } from './yjs.service'
import { CanvasBroadcaster } from '@/modules/socket/canvas.broadcaster'
import { Socket, Server } from 'socket.io'
import { CanvasAttachPayload, CanvasDetachPayload, YjsUpdatePayload, YjsAwarenessPayload } from './dto/yjs.dto'

describe('CanvasGateway', () => {
  let gateway: CanvasGateway

  // Mock 객체 정의 (useValue용)
  const mockYjsService = {
    initializeConnection: jest.fn(),
    disconnectClient: jest.fn(),
    processUpdate: jest.fn(),
  }

  const mockBroadcaster = {
    setServer: jest.fn(),
    emitToCanvas: jest.fn(),
  }

  // Socket & Server Mock
  const mockSocket = {
    id: 'socket-1',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
  } as unknown as Socket

  const mockServer = {
    emit: jest.fn(),
  } as unknown as Server

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [CanvasGateway, { provide: YjsService, useValue: mockYjsService }, { provide: CanvasBroadcaster, useValue: mockBroadcaster }],
    }).compile()

    gateway = module.get(CanvasGateway)

    // Gateway에 Server 주입
    gateway.server = mockServer
  })

  describe('afterInit', () => {
    it('초기화 후 브로드캐스터에 서버 인스턴스를 설정해야 한다', () => {
      gateway.afterInit(mockServer)
      expect(mockBroadcaster.setServer).toHaveBeenCalledWith(mockServer)
    })
  })

  describe('handleDisconnect', () => {
    it('클라이언트 연결 해제 시 참여 중인 캔버스에 Awareness(퇴장)를 전파해야 한다', () => {
      mockYjsService.disconnectClient.mockReturnValue(['canvas-A', 'canvas-B'])

      gateway.handleDisconnect(mockSocket)

      expect(mockYjsService.disconnectClient).toHaveBeenCalledWith(mockSocket.id)

      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledWith('canvas-A', 'y:awareness', {
        socketId: mockSocket.id,
        state: {},
      })
      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledWith('canvas-B', 'y:awareness', {
        socketId: mockSocket.id,
        state: {},
      })
      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledTimes(2)
    })

    it('참여 중인 캔버스가 없는 경우 Awareness를 전파하지 않아야 한다', () => {
      mockYjsService.disconnectClient.mockReturnValue([])

      gateway.handleDisconnect(mockSocket)

      expect(mockYjsService.disconnectClient).toHaveBeenCalledWith(mockSocket.id)
      expect(mockBroadcaster.emitToCanvas).not.toHaveBeenCalled()
    })
  })

  describe('onCanvasAttach', () => {
    it('캔버스 참여 요청 시 초기화 로직을 수행하고 룸에 조인해야 한다', async () => {
      const payload: CanvasAttachPayload = { roomId: 'room-1', canvasId: 'canvas-1' }
      const mockResponse = { docKey: 'room-1-canvas-1', update: new Uint8Array([1, 2, 3]) }

      mockYjsService.initializeConnection.mockResolvedValue(mockResponse)

      await gateway.onCanvasAttach(mockSocket, payload)

      expect(mockYjsService.initializeConnection).toHaveBeenCalledWith(payload.roomId, payload.canvasId, mockSocket.id)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSocket.join).toHaveBeenCalledWith(`canvas:${payload.canvasId}`)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSocket.emit).toHaveBeenCalledWith('canvas:attached', mockResponse)
    })

    it('초기화 실패 시 에러가 전파되어야 한다', async () => {
      const payload: CanvasAttachPayload = { roomId: 'room-1', canvasId: 'canvas-1' }
      const error = new Error('초기화 실패')

      mockYjsService.initializeConnection.mockRejectedValue(error)

      await expect(gateway.onCanvasAttach(mockSocket, payload)).rejects.toThrow(error)
    })
  })

  describe('onCanvasDetach', () => {
    it('캔버스 이탈 요청 시 룸에서 나가고 Awareness(퇴장)를 전파해야 한다', async () => {
      const payload: CanvasDetachPayload = { canvasId: 'canvas-1' }

      await gateway.onCanvasDetach(mockSocket, payload)

      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledWith('canvas-1', 'y:awareness', {
        socketId: mockSocket.id,
        state: {},
      })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSocket.leave).toHaveBeenCalledWith(`canvas:${payload.canvasId}`)
      expect(mockYjsService.disconnectClient).toHaveBeenCalledWith(mockSocket.id)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSocket.emit).toHaveBeenCalledWith('canvas:detached', {})
    })
  })

  describe('onYjsUpdate', () => {
    it('Yjs 업데이트 수신 시 Uint8Array로 변환하여 처리하고 브로드캐스트해야 한다', () => {
      const payload: YjsUpdatePayload = {
        canvasId: 'canvas-1',
        update: [1, 2, 3],
      }

      gateway.onYjsUpdate(mockSocket, payload)

      expect(mockYjsService.processUpdate).toHaveBeenCalledWith(payload.canvasId, expect.any(Uint8Array))

      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledWith(payload.canvasId, 'y:update', payload, { exceptSocketId: mockSocket.id })
    })
  })

  describe('onYjsAwareness', () => {
    it('Awareness 업데이트 시 저장 없이 브로드캐스트만 수행해야 한다', () => {
      const payload: YjsAwarenessPayload = {
        canvasId: 'canvas-1',
        state: {
          cursor: {
            x: 10,
            y: 10,
            name: '',
          },
        },
      }

      gateway.onYjsAwareness(mockSocket, payload)

      expect(mockBroadcaster.emitToCanvas).toHaveBeenCalledWith(
        payload.canvasId,
        'y:awareness',
        {
          socketId: mockSocket.id,
          state: payload.state,
        },
        { exceptSocketId: mockSocket.id },
      )

      expect(mockYjsService.processUpdate).not.toHaveBeenCalled()
    })
  })
})
