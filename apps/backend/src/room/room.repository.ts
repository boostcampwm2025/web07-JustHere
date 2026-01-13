import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Room } from '@prisma/client'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(title: string): Promise<Room> {
    const maxRetries = 3
    let lastError: Error | undefined

    for (let i = 0; i < maxRetries; i++) {
      try {
        const slug = nanoid()
        return await this.prisma.room.create({
          data: { title, slug },
        })
      } catch (error) {
        lastError = error
        if (error.code !== 'P2002') {
          throw error
        }
        // slug 중복이면 재시도
      }
    }
    throw new Error(`최대 재시도 횟수 ${maxRetries} 회를 초과하였습니다: ${lastError ? lastError.message : '알 수 없는 오류'}`)
  }
}
