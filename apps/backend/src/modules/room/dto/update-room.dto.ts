import { PickType } from '@nestjs/swagger'
import { CreateRoomDto } from './create-room.dto'

export class UpdateRoomDto extends PickType(CreateRoomDto, ['x', 'y', 'place_name'] as const) {}
