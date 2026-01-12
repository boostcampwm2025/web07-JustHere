import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketBroadcaster } from '@/socket/socket.broadcaster';
import {
  type RoomJoinPayload,
  type RoomLeavePayload,
  roomJoinSchema,
  roomLeaveSchema,
} from './dto/room.c2s.dto';
import { RoomService } from './room.service';

@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
export class RoomGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: SocketBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server);
  }

  async handleDisconnect(client: Socket) {
    await this.roomService.leaveByDisconnect(client);
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomJoinPayload,
  ) {
    const parsed = roomJoinSchema.safeParse(payload);
    if (!parsed.success) return;

    await this.roomService.joinRoom(client, parsed.data);
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomLeavePayload,
  ) {
    const parsed = roomLeaveSchema.safeParse(payload);
    if (!parsed.success) return;

    await this.roomService.leaveRoomBySession(client, parsed.data);
  }
}
