import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdsayController } from './odsay.controller';
import { OdsayService } from './odsay.service';

@Module({
  imports: [ConfigModule],
  controllers: [OdsayController],
  providers: [OdsayService],
  exports: [OdsayService],
})
export class OdsayModule {}
