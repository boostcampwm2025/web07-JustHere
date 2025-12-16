import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Room } from '@/rooms/entities/room.entity';
import { RoomResponseDto } from '@/rooms/dto/room-response.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async create(): Promise<RoomResponseDto> {
    const room = this.roomRepository.create();
    const savedRoom = await this.roomRepository.save(room);

    return plainToInstance(RoomResponseDto, {
      id: savedRoom.id,
      createdAt: savedRoom.createdAt,
    });
  }
}
