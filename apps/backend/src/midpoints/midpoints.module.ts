import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MidpointsController } from '@/midpoints/midpoints.controller';
import { MidpointsService } from '@/midpoints/midpoints.service';
import { Participant } from '@/participants/entities/participant.entity';
import { Room } from '@/rooms/entities/room.entity';
import { ParticipantsModule } from '@/participants/participants.module';
import { OdsayService } from '@/odsay/odsay.service';
import { KakaoDirectionsService } from '@/kakao/kakao-directions.service';
import { KakaoPlacesService } from '@/kakao/kakao-places.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, Room]),
    HttpModule,
    ParticipantsModule,
  ],
  controllers: [MidpointsController],
  providers: [
    MidpointsService,
    OdsayService,
    KakaoDirectionsService,
    KakaoPlacesService,
  ],
})
export class MidpointsModule {}
