import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Room } from '@prisma/client'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
  }

  async createRoom(data: { title: string; x: number; y: number; place_name?: string }): Promise<Room> {
    const maxRetries = 3
    let lastError: Error | undefined

    for (let i = 0; i < maxRetries; i++) {
      try {
        const slug = nanoid()
        return await this.prisma.room.create({
          data: {
            title: data.title,
            slug,
            x: data.x,
            y: data.y,
            place_name: data.place_name || '',
          },
        })
      } catch (error) {
        lastError = error as Error
        if (!this.isPrismaUniqueConstraintError(error)) {
          throw error
        }
        // slug 중복이면 재시도
      }
    }
    throw new Error(`최대 재시도 횟수 ${maxRetries} 회를 초과하였습니다: ${lastError ? lastError.message : '알 수 없는 오류'}`)
  }

  async findBySlug(slug: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { slug },
    })
  }
}
