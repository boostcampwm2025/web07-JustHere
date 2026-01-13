import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { CategoryRepository } from './category.repository'

@Module({
  imports: [PrismaModule],
  providers: [CategoryRepository],
  exports: [CategoryRepository],
})
export class CategoryModule {}
