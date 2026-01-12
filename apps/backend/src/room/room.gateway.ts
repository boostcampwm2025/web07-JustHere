import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  type RoomJoinPayload,
  type RoomLeavePayload,
  RoomJoinSchema,
  RoomLeaveSchema,
} from './dto/room.request.dto';
import { RoomService } from './room.service';

@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
export class RoomGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  async handleDisconnect(client: Socket) {
    await this.roomService.leaveByDisconnect(client);
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload,
  ) {
    const parsed = RoomJoinSchema.safeParse(payload);
    if (!parsed.success) return;

    await this.roomService.joinRoom(client, parsed.data);
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomLeavePayload,
  ) {
    const parsed = RoomLeaveSchema.safeParse(payload);
    if (!parsed.success) return;

    await this.roomService.leaveRoom(client, parsed.data);
  }
}
