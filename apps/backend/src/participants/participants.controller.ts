import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ParticipantsService } from '@/participants/participants.service';
import { CreateParticipantDto } from '@/participants/dto/create-participant.dto';
import { ParticipantResponseDto } from '@/participants/dto/participant-response.dto';

@Controller('rooms')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post(':roomId/participants')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: CreateParticipantDto,
  ): Promise<ParticipantResponseDto> {
    return this.participantsService.create(roomId, dto);
  }

  @Get(':roomId/participants')
  async findAll(
    @Param('roomId', ParseIntPipe) roomId: number,
  ): Promise<ParticipantResponseDto[]> {
    return this.participantsService.findAll(roomId);
  }
}
