import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { YjsService } from '@/yjs/yjs.service'
import { CanvasBroadcaster } from '@/socket/canvas.broadcaster'
import { CanvasAttachPayload, CanvasDetachPayload, YjsUpdatePayload, YjsAwarenessPayload } from './dto/yjs.dto'

@WebSocketGateway({
  namespace: '/canvas',
  cors: { origin: '*' },
})
export class CanvasGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly yjsService: YjsService,
    private readonly broadcaster: CanvasBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  handleDisconnect(client: Socket) {
    this.yjsService.disconnectClient(client.id)
  }

  /**
   * 클라이언트가 캔버스에 참여
   */
  @SubscribeMessage('canvas:attach')
  async onCanvasAttach(@ConnectedSocket() client: Socket, @MessageBody() payload: CanvasAttachPayload) {
    const { roomId, canvasId } = payload

    // Socket.io room에 참여
    await client.join(`canvas:${canvasId}`)

    // Yjs 문서 생성 및 클라이언트 연결
    this.yjsService.getOrCreateDocument(roomId, canvasId)
    this.yjsService.connectClient(canvasId, client.id)

    // 현재 문서 전체 상태를 클라이언트에게 전송 (동기화)
    const stateVector = this.yjsService.getStateVector(canvasId)
    const docKey = `${roomId}-${canvasId}`

    client.emit('canvas:attached', {
      docKey,
      update: stateVector ? Array.from(stateVector) : undefined,
    })
  }

  /**
   * 클라이언트가 캔버스에서 나감
   */
  @SubscribeMessage('canvas:detach')
  async onCanvasDetach(@ConnectedSocket() client: Socket, @MessageBody() payload: CanvasDetachPayload) {
    const { canvasId } = payload

    await client.leave(`canvas:${canvasId}`)
    this.yjsService.disconnectClient(client.id)

    client.emit('canvas:detached', {})
  }

  /**
   * Yjs 업데이트 수신 및 브로드캐스트
   */
  @SubscribeMessage('y:update')
  onYjsUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: YjsUpdatePayload) {
    const { canvasId, update } = payload

    // number[] -> Uint8Array
    const updateArray = new Uint8Array(update)

    // Yjs 문서에 업데이트 적용
    const applied = this.yjsService.applyUpdate(canvasId, updateArray)
    if (!applied) return

    // 다른 클라이언트들에게 업데이트 브로드캐스트
    this.broadcaster.emitToCanvas(
      canvasId,
      'y:update',
      {
        canvasId,
        update,
      },
      {
        exceptSocketId: client.id, // 본인 제외
      },
    )
  }

  /**
   * Awareness 업데이트 (커서, 선택 상태 등)
   */
  @SubscribeMessage('y:awareness')
  onYjsAwareness(@ConnectedSocket() client: Socket, @MessageBody() payload: YjsAwarenessPayload) {
    const { canvasId, state } = payload

    // Awareness는 서버에 저장하지 않고 바로 브로드캐스트
    this.broadcaster.emitToCanvas(
      canvasId,
      'y:awareness',
      {
        socketId: client.id,
        state,
      },
      {
        exceptSocketId: client.id,
      },
    )
  }
}
