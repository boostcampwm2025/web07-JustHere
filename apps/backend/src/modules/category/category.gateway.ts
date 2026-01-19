import { WebsocketExceptionsFilter } from '@/lib/filter'
import { UseFilters } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, MessageBody, ConnectedSocket } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { RoomBroadcaster } from '@/modules/socket/room.broadcaster'
import { CategoryService } from './category.service'
import { CreateCategoryPayload, DeleteCategoryPayload } from './dto/category.c2s.dto'

@UseFilters(new WebsocketExceptionsFilter())
@WebSocketGateway({
  namespace: '/room',
  cors: { origin: '*' },
})
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
    const createCategoryPayload = plainToInstance(CreateCategoryPayload, payload)
    const errors = validateSync(createCategoryPayload)
    if (errors.length > 0) return

    await this.categoryService.createCategory(client, createCategoryPayload.name)
  }

  @SubscribeMessage('category:delete')
  async onDeleteCategory(@ConnectedSocket() client: Socket, @MessageBody() payload: DeleteCategoryPayload) {
    const deleteCategoryPayload = plainToInstance(DeleteCategoryPayload, payload)
    const errors = validateSync(deleteCategoryPayload)
    if (errors.length > 0) return

    await this.categoryService.deleteCategory(client, deleteCategoryPayload.categoryId)
  }
}
