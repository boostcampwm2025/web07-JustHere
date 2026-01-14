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
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { SocketBroadcaster } from '@/socket/socket.broadcaster'
import { ParticipantUpdateNamePayload, RoomJoinPayload, RoomTransferOwnerPayload } from './dto/room.c2s.dto'
import { RoomService } from './room.service'

@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
export class RoomGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: SocketBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  async handleDisconnect(client: Socket) {
    await this.roomService.leaveByDisconnect(client)
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomJoinPayload) {
    const roomJoinPayload = plainToInstance(RoomJoinPayload, payload)
    const errors = validateSync(roomJoinPayload)
    if (errors.length > 0) return

    await this.roomService.joinRoom(client, roomJoinPayload)
  }

  @SubscribeMessage('room:leave')
  async onRoomLeave(@ConnectedSocket() client: Socket) {
    await this.roomService.leaveRoomBySession(client)
  }

  @SubscribeMessage('participant:update_name')
  async onUpdateName(@ConnectedSocket() client: Socket, @MessageBody() payload: ParticipantUpdateNamePayload) {
    const updatedNamePayload = plainToInstance(ParticipantUpdateNamePayload, payload)
    const errors = validateSync(updatedNamePayload)
    if (errors.length > 0) return

    await this.roomService.updateParticipantName(client, updatedNamePayload.name)
  }

  @SubscribeMessage('room:transfer_owner')
  async onTransferOwner(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomTransferOwnerPayload) {
    const transferPayload = plainToInstance(RoomTransferOwnerPayload, payload)
    const errors = validateSync(transferPayload)
    if (errors.length > 0) return

    await this.roomService.transferOwner(client, transferPayload.targetUserId)
  }
}
