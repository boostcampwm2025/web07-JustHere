import { Module } from '@nestjs/common'

import { SwaggerService } from '@/lib/swagger/swagger.service'

@Module({
  imports: [],
  providers: [SwaggerService],
  exports: [SwaggerService],
})
export class SwaggerConfigModule {}
