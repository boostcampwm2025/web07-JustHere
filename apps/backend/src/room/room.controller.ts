import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { RoomService } from './room.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { RoomResponseDto } from './dto/room-response.dto'

@ApiTags('room')
@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '방 생성',
    description: '새로운 방을 생성하고 초대 링크용 slug를 발급합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '방 생성 성공',
    type: RoomResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
  })
  async createRoom(@Body() dto: CreateRoomDto): Promise<RoomResponseDto> {
    return await this.roomService.createRoom({ x: dto.x, y: dto.y, place_name: dto.place_name })
  }
}
