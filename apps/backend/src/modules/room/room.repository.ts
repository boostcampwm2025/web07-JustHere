import { CustomException } from '@/lib/exceptions/custom.exception'
import { ErrorType } from '@/lib/types/response.type'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/lib/prisma/prisma.service'
import { Room } from '@prisma/client'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

@Injectable()
export class RoomRepository {
  private readonly logger = new Logger(RoomRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002'
  }

  async createRoom(data: { x: number; y: number; place_name?: string }): Promise<Room> {
    const maxRetries = 3

    for (let i = 0; i < maxRetries; i++) {
      try {
        const slug = nanoid()
        return await this.prisma.room.create({
          data: {
            slug,
            x: data.x,
            y: data.y,
            place_name: data.place_name || '',
          },
        })
      } catch (error) {
        if (this.isPrismaUniqueConstraintError(error)) {
          // 슬러그 중복 시 로그 남기고 재시도
          this.logger.warn(`Slug collision detected: ${error}`)
          continue
        }
        // 그 외 DB 에러는 즉시 throw
        throw error
      }
    }

    // 최대 재시도 횟수 초과 시 CustomException 발생
    throw new CustomException(ErrorType.InternalServerError, '방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  async findBySlug(slug: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { slug },
    })
  }

  async findById(id: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
    })
  }

  async updateBySlug(slug: string, data: { x: number; y: number; place_name?: string }) {
    return this.prisma.room.update({
      where: { slug },
      data,
    })
  }
}
