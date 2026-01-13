import { Injectable } from '@nestjs/common'
import { Room } from '@prisma/client'
import { RoomRepository } from './room.repository'

@Injectable()
export class RoomService {
  constructor(private readonly roomRepository: RoomRepository) {}

  async createRoom(title: string): Promise<Room> {
    return this.roomRepository.createRoom(title)
  }
}
