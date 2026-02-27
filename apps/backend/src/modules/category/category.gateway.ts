import { UseFilters, UsePipes } from '@nestjs/common'
import { WebsocketExceptionsFilter } from '@/lib/filter'
import { defaultValidationPipe } from '@/lib/pipes/validation.pipe'
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, MessageBody, ConnectedSocket } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { CategoryService } from './category.service'
import { CreateCategoryPayload, DeleteCategoryPayload } from './dto/category.c2s.dto'
import { CategoryCreatedPayload, CategoryDeletedPayload } from './dto/category.s2c.dto'

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
    const { category, roomId } = await this.categoryService.createCategory(client.id, payload.name)

    const response: CategoryCreatedPayload = {
      categoryId: category.id,
      name: category.title,
    }

    this.broadcaster.emitToRoom(roomId, 'category:created', response)
  }

  @SubscribeMessage('category:delete')
  async onDeleteCategory(@ConnectedSocket() client: Socket, @MessageBody() payload: DeleteCategoryPayload) {
    const { roomId, categoryId } = await this.categoryService.deleteCategory(client.id, payload.categoryId)

    const response: CategoryDeletedPayload = {
      categoryId,
    }

    this.broadcaster.emitToRoom(roomId, 'category:deleted', response)
  }
}
