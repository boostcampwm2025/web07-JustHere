import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsController } from '@/participants/participants.controller';
import { ParticipantsService } from '@/participants/participants.service';
import { Participant } from '@/participants/entities/participant.entity';
import { Room } from '@/rooms/entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Room])],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
