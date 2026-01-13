import { Injectable } from '@nestjs/common'
import { Room } from '@prisma/client'
import { RoomRepository } from './room.repository'

@Injectable()
export class RoomService {
  constructor(private readonly roomRepository: RoomRepository) {}

  async createRoom(data: { title: string; x: number; y: number; place_name?: string }): Promise<Room> {
    return this.roomRepository.createRoom(data)
  }
}
