// category/category.gateway.ts
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
import { SocketBroadcaster } from '@/socket/socket.broadcaster'

@WebSocketGateway({
  namespace: '/category',
  cors: { origin: '*' },
})
export class CategoryGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly yjsService: YjsService,
    private readonly broadcaster: SocketBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  handleDisconnect(client: Socket) {
    this.yjsService.disconnectClient(client.id)
  }

  /**
   * 클라이언트가 특정 Category 화이트보드에 참여
   */
  @SubscribeMessage('category:join')
  async onCategoryJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; categoryId: string }) {
    const { roomId, categoryId } = payload

    // Socket.io room에 참여
    await client.join(`category:${categoryId}`)

    // Yjs 문서 생성 및 클라이언트 연결
    this.yjsService.getOrCreateDocument(roomId, categoryId)
    this.yjsService.connectClient(categoryId, client.id)

    // 현재 문서 전체 상태를 클라이언트에게 전송 (동기화)
    const stateVector = this.yjsService.getStateVector(categoryId)
    if (stateVector) {
      client.emit('category:sync', {
        categoryId,
        update: Array.from(stateVector), // Uint8Array -> number[]
      })
    }

    // 다른 클라이언트들에게 새 참여자 알림
    this.broadcaster.emitToRoom(
      categoryId,
      'category:user_joined',
      {
        socketId: client.id,
        connectionCount: this.yjsService.getConnectionCount(categoryId),
      },
      {
        exceptSocketId: client.id,
      },
    )
  }

  /**
   * 클라이언트가 Category에서 나감
   */
  @SubscribeMessage('category:leave')
  async onCategoryLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { categoryId: string }) {
    const { categoryId } = payload

    await client.leave(`category:${categoryId}`)
    this.yjsService.disconnectClient(client.id)

    this.broadcaster.emitToRoom(categoryId, 'category:user_left', {
      socketId: client.id,
      connectionCount: this.yjsService.getConnectionCount(categoryId),
    })
  }

  /**
   * Yjs 업데이트 수신 및 브로드캐스트
   */
  @SubscribeMessage('category:update')
  onUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: { categoryId: string; update: number[] }) {
    const { categoryId, update } = payload

    // number[] -> Uint8Array
    const updateArray = new Uint8Array(update)

    // Yjs 문서에 업데이트 적용
    const applied = this.yjsService.applyUpdate(categoryId, updateArray)
    if (!applied) return

    // 다른 클라이언트들에게 업데이트 브로드캐스트
    this.broadcaster.emitToRoom(
      categoryId,
      'category:update',
      {
        categoryId,
        update,
        from: client.id,
      },
      {
        exceptSocketId: client.id, // 본인 제외
      },
    )
  }

  /**
   * Awareness 업데이트 (커서, 선택 상태 등)
   */
  @SubscribeMessage('category:awareness')
  onAwareness(@ConnectedSocket() client: Socket, @MessageBody() payload: { categoryId: string; state: any }) {
    const { categoryId, state } = payload

    // Awareness는 서버에 저장하지 않고 바로 브로드캐스트
    this.broadcaster.emitToRoom(
      categoryId,
      'category:awareness',
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
