import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'
import { SocketModule } from '@/socket/socket.module'
import { CategoryRepository } from './category.repository'
import { CategoryService } from './category.service'
import { CategoryGateway } from './category.gateway'

@Module({
  imports: [PrismaModule, UserModule, SocketModule],
  providers: [CategoryRepository, CategoryService, CategoryGateway],
  exports: [CategoryService],
})
export class CategoryModule {}
