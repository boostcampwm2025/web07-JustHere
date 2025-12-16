import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from '@/rooms/rooms.controller';
import { RoomsService } from '@/rooms/rooms.service';
import { Room } from '@/rooms/entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
