import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: {
    origin: process.env.FE_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class CategoryGateway {
  @WebSocketServer() server: Server

  constructor() {}

  @SubscribeMessage('join_category')
  handleJoinCategory(@MessageBody() data: { roomId: string; categoryId: string }, @ConnectedSocket() client: Socket) {
    const socketId = `rooms:${data.roomId}:category:${data.categoryId}`
    client.join(socketId)

    console.log(`join_category: roomId=${data.roomId}, categoryId: ${data.categoryId}`)
  }

  @SubscribeMessage('leave_category')
  handleLeaveCategory(@MessageBody() data: { roomId: string; categoryId: string }, @ConnectedSocket() client: Socket) {
    const socketId = `rooms:${data.roomId}:category:${data.categoryId}`

    client.leave(socketId)
  }

  @SubscribeMessage('yjs_update')
  handleYjsUpdate(@MessageBody() data: { roomId: string; categoryId: string; update: Uint8Array }, @ConnectedSocket() client: Socket) {
    const socketId = `rooms:${data.roomId}:category:${data.categoryId}`
    // 나를 제외한 방의 모든 사람에게 업데이트 데이터 전송
    // (broadcast.to를 쓰면 나에게는 안 옴 - 중요!)
    console.log(`yjs_update: socketId=${socketId}`)

    client.broadcast.to(socketId).emit('yjs_update', data.update)

    // TODO: 여기서 DB(PostgreSQL)에 주기적으로 update 데이터를 저장(Throttling)하는 로직 추가 필요
    // 단, 잦은 접근은 redis 같은 in-memory 저장소 활용 + 주기적으로 snapshot만 RDB에 저장하는 방식으로 변경해도 좋을 듯
  }
}
