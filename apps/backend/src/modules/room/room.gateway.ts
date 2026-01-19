import { WebsocketExceptionsFilter } from '@/lib/filter'
import { UseFilters } from '@nestjs/common'
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
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { ParticipantUpdateNamePayload, RoomJoinPayload, RoomTransferOwnerPayload } from './dto/room.c2s.dto'
import { RoomService } from './room.service'

@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
@UseFilters(new WebsocketExceptionsFilter('room'))
export class RoomGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: RoomBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  async handleDisconnect(client: Socket) {
    await this.roomService.leaveByDisconnect(client)
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomJoinPayload) {
    await this.roomService.joinRoom(client, payload)
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(@ConnectedSocket() client: Socket) {
    await this.roomService.leaveRoomBySession(client)
  }

  @SubscribeMessage('participant:update_name')
  onUpdateName(@ConnectedSocket() client: Socket, @MessageBody() payload: ParticipantUpdateNamePayload) {
    this.roomService.updateParticipantName(client, payload.name)
  }

  @SubscribeMessage('room:transfer_owner')
  onTransferOwner(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomTransferOwnerPayload) {
    this.roomService.transferOwner(client, payload.targetUserId)
  }
}
