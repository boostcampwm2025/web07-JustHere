import { Module, forwardRef } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { RoomModule } from '@/room/room.module'
import { UserModule } from '@/user/user.module'
import { CategoryRepository } from './category.repository'
import { CategoryService } from './category.service'
import { CategoryController } from './category.controller'

@Module({
  imports: [PrismaModule, forwardRef(() => RoomModule), UserModule],
  controllers: [CategoryController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
