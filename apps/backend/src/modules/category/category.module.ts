import { CategoryGateway } from '@/modules/category/category.gateway'
import { WhiteboardModule } from '@/modules/whiteboard/whiteboard.module'
import { Module } from '@nestjs/common'

@Module({
  imports: [WhiteboardModule],
  controllers: [],
  providers: [CategoryGateway],
})
export class CategoryModule {}
