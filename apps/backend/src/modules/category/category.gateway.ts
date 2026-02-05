import { UseFilters, UsePipes } from '@nestjs/common'
import { WebsocketExceptionsFilter } from '@/lib/filter'
import { defaultValidationPipe } from '@/lib/pipes/validation.pipe'
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, MessageBody, ConnectedSocket } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { CategoryService } from './category.service'
import { CreateCategoryPayload, DeleteCategoryPayload } from './dto/category.c2s.dto'

@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
@UseFilters(new WebsocketExceptionsFilter('category'))
@UsePipes(defaultValidationPipe)
export class CategoryGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly categoryService: CategoryService,
    private readonly broadcaster: RoomBroadcaster,
  ) {}

  afterInit(server: Server) {
    this.broadcaster.setServer(server)
  }

  @SubscribeMessage('category:create')
  async onCreateCategory(@ConnectedSocket() client: Socket, @MessageBody() payload: CreateCategoryPayload) {
    await this.categoryService.createCategory(client, payload.name)
  }

  @SubscribeMessage('category:delete')
  async onDeleteCategory(@ConnectedSocket() client: Socket, @MessageBody() payload: DeleteCategoryPayload) {
    await this.categoryService.deleteCategory(client, payload.categoryId)
  }
}
