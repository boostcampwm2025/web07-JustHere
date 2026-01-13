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
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SocketBroadcaster } from '@/socket/socket.broadcaster';
import { RoomJoinPayload, RoomLeavePayload } from './dto/room.c2s.dto';
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
    const roomJoinPayload = plainToInstance(RoomJoinPayload, payload);
    const errors = validateSync(roomJoinPayload);
    if (errors.length > 0) return;

    await this.roomService.joinRoom(client, roomJoinPayload);
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomLeavePayload,
  ) {
    const roomLeavePayload = plainToInstance(RoomLeavePayload, payload);
    const errors = validateSync(roomLeavePayload);
    if (errors.length > 0) return;

    await this.roomService.leaveRoomBySession(client, roomLeavePayload);
  }
}
