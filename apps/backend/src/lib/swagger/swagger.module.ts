import { Module } from '@nestjs/common'

import { SwaggerService } from './swagger.service'

@Module({
  imports: [],
  providers: [SwaggerService],
  exports: [SwaggerService],
})
export class SwaggerConfigModule {}
