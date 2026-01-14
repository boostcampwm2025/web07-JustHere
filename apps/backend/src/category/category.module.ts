import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { RoomRepositoryModule } from '@/room/room-repository.module'
import { UserModule } from '@/user/user.module'
import { CategoryRepository } from './category.repository'
import { CategoryService } from './category.service'
import { CategoryController } from './category.controller'

@Module({
  imports: [PrismaModule, RoomRepositoryModule, UserModule],
  controllers: [CategoryController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryRepository, CategoryService],
})
export class CategoryModule {}
