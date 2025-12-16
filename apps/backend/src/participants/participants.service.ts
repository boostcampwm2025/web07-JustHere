import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Participant } from '@/participants/entities/participant.entity';
import { Room } from '@/rooms/entities/room.entity';
import { CreateParticipantDto } from '@/participants/dto/create-participant.dto';
import { ParticipantResponseDto } from '@/participants/dto/participant-response.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async create(
    roomId: number,
    dto: CreateParticipantDto,
  ): Promise<ParticipantResponseDto> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    const participant = this.participantRepository.create({
      ...dto,
      roomId,
    });
    const savedParticipant = await this.participantRepository.save(participant);

    return plainToInstance(ParticipantResponseDto, {
      id: savedParticipant.id,
      name: savedParticipant.name,
      address: savedParticipant.address,
      lat: Number(savedParticipant.lat),
      lng: Number(savedParticipant.lng),
      transportMode: savedParticipant.transportMode,
      createdAt: savedParticipant.createdAt,
    });
  }

  async findAll(roomId: number): Promise<ParticipantResponseDto[]> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    const participants = await this.participantRepository.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
    });

    return participants.map((p) =>
      plainToInstance(ParticipantResponseDto, {
        id: p.id,
        name: p.name,
        address: p.address,
        lat: Number(p.lat),
        lng: Number(p.lng),
        transportMode: p.transportMode,
        createdAt: p.createdAt,
      }),
    );
  }
}
