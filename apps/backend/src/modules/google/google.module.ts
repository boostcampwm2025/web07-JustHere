import { Module } from '@nestjs/common'
import { GoogleController } from './google.controller'
import { GoogleService } from './google.service'
import { RoomModule } from '../room/room.module'

@Module({
  imports: [RoomModule],
  controllers: [GoogleController],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class GoogleModule {}
