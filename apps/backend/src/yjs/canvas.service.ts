import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import * as Y from 'yjs'

@Injectable()
export class CanvasService {
  constructor(private readonly prisma: PrismaService) {}

  // 초기 데이터 로드 (DB -> Merged Uint8Array)
  async getMergedUpdate(categoryId: string): Promise<Uint8Array> {
    const logs = await this.prisma.categoryUpdateLog.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    })

    if (logs.length === 0) return new Uint8Array()

    const updates = logs.map(log => new Uint8Array(log.updateData))
    return Y.mergeUpdates(updates)
  }

  // 업데이트 로그 저장 (Uint8Array -> DB)
  async saveUpdateLog(canvasId: string, update: Uint8Array) {
    await this.prisma.categoryUpdateLog.create({
      data: {
        categoryId: canvasId,
        updateData: Buffer.from(update),
      },
    })
  }
}
