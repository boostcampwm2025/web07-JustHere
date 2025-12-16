import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { RoomsService } from '@/rooms/rooms.service';
import { RoomResponseDto } from '@/rooms/dto/room-response.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(): Promise<RoomResponseDto> {
    return this.roomsService.create();
  }
}
