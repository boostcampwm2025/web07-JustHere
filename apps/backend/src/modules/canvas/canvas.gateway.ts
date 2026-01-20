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
import { YjsService } from './yjs.service'
import { CanvasBroadcaster } from '@/modules/socket/canvas.broadcaster'
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
    const canvasIds = this.yjsService.disconnectClient(client.id)

    // 참여 중이던 캔버스들에 커서 삭제 브로드캐스트
    for (const canvasId of canvasIds) {
      this.broadcaster.emitToCanvas(canvasId, 'y:awareness', {
        socketId: client.id,
        state: {},
      })
    }
  }

  /**
   * 클라이언트가 캔버스에 참여
   */
  @SubscribeMessage('canvas:attach')
  async onCanvasAttach(@ConnectedSocket() client: Socket, @MessageBody() payload: CanvasAttachPayload) {
    const { roomId, canvasId } = payload

    // Socket.io room에 참여
    await client.join(`canvas:${canvasId}`)

    const response = await this.yjsService.initializeConnection(roomId, canvasId, client.id)

    client.emit('canvas:attached', response)
  }

  /**
   * 클라이언트가 캔버스에서 나감
   */
  @SubscribeMessage('canvas:detach')
  async onCanvasDetach(@ConnectedSocket() client: Socket, @MessageBody() payload: CanvasDetachPayload) {
    const { canvasId } = payload

    // 다른 클라이언트에게 커서 삭제 브로드캐스트
    this.broadcaster.emitToCanvas(canvasId, 'y:awareness', {
      socketId: client.id,
      state: {},
    })

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

    // Yjs 문서에 업데이트 적용 & 버퍼링
    const isSuccess = this.yjsService.processUpdate(canvasId, updateArray)

    // 다른 클라이언트들에게 업데이트 브로드캐스트
    if (isSuccess) {
      this.broadcaster.emitToCanvas(canvasId, 'y:update', payload, { exceptSocketId: client.id })
    }
  }

  /**
   * Awareness 업데이트 (커서, 선택 상태 등)
   */
  @SubscribeMessage('y:awareness')
  onYjsAwareness(@ConnectedSocket() client: Socket, @MessageBody() payload: YjsAwarenessPayload) {
    const { canvasId, state } = payload

    // Awareness는 서버에 저장하지 않고 바로 브로드캐스트
    // TODO 메모리 캐시에 저장하여 뒤늦게 들어온 참여자도 정보를 바로 볼 수 있게해야함
    this.broadcaster.emitToCanvas(canvasId, 'y:awareness', { socketId: client.id, state }, { exceptSocketId: client.id })
  }
}
