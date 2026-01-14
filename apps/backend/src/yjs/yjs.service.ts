// yjs/yjs.service.ts
import { CanvasService } from '@/yjs/canvas.service'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import * as Y from 'yjs'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'

interface YjsDocument {
  doc: Y.Doc
  roomId: string
  categoryId: string
  connections: Set<string> // socketId들
}

@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly canvasService: CanvasService) {}

  // categoryId -> YjsDocument 매핑
  private documents = new Map<string, YjsDocument>()

  // 업데이트 버퍼: categoryId -> 업데이트 바이너리 배열
  private updateBuffer = new Map<string, Uint8Array[]>()

  // 배치 저장 타이머
  private saveInterval: NodeJS.Timeout

  onModuleInit() {
    // 5초마다 버퍼에 쌓인 데이터를 DB에 저장
    // 트래픽이 많아지면 시간을 더 줄여야 할 듯
    this.saveInterval = setInterval(() => {
      return this.flushBufferToDB()
    }, 5000)
  }

  onModuleDestroy() {
    // 서버 종료 시 남은 데이터 강제 저장
    clearInterval(this.saveInterval)
    this.flushBufferToDB()
  }

  /**
   * Category용 Yjs 문서 생성 또는 가져오기
   * Y.Doc이 메모리에 없다면, DB에서 조회해서 메모리 초기화.
   */
  async getOrCreateDocument(roomId: string, categoryId: string): Promise<Y.Doc> {
    const existing = this.documents.get(categoryId)
    if (existing) return existing.doc

    const doc = new Y.Doc()

    // DB에서 기존 데이터 불러와서 병합
    const initialUpdate = await this.canvasService.getMergedUpdate(categoryId)
    if (initialUpdate.byteLength > 0) {
      Y.applyUpdate(doc, initialUpdate)
    }

    this.documents.set(categoryId, {
      doc,
      roomId,
      categoryId,
      connections: new Set(),
    })

    return doc
  }

  /**
   * 클라이언트를 문서에 연결
   */
  connectClient(categoryId: string, socketId: string) {
    const yjsDoc = this.documents.get(categoryId)
    if (!yjsDoc) return

    yjsDoc.connections.add(socketId)
  }

  /**
   * 클라이언트 연결 해제
   */
  disconnectClient(socketId: string) {
    for (const [, yjsDoc] of this.documents.entries()) {
      if (yjsDoc.connections.has(socketId)) {
        yjsDoc.connections.delete(socketId)
      }
    }
  }

  /**
   * 현재 문서 상태를 전체 업데이트로 인코딩
   */
  getStateVector(categoryId: string): Uint8Array | null {
    const yjsDoc = this.documents.get(categoryId)
    if (!yjsDoc) return null

    return encodeStateAsUpdate(yjsDoc.doc)
  }

  /**
   * 클라이언트로부터 받은 업데이트 적용
   */
  applyUpdate(categoryId: string, update: Uint8Array): boolean {
    const yjsDoc = this.documents.get(categoryId)
    if (!yjsDoc) return false

    try {
      applyUpdate(yjsDoc.doc, update)

      // DB에 비동기 저장 (await 없이 적용해야 함)
      this.canvasService.saveUpdateLog(categoryId, update).catch(err => console.error('DB Save Error:', err))

      return true
    } catch (error) {
      console.error('Failed to apply Yjs update:', error)
      return false
    }
  }

  /**
   * Category에 연결된 클라이언트 수
   */
  getConnectionCount(categoryId: string): number {
    return this.documents.get(categoryId)?.connections.size ?? 0
  }

  /**
   * YjsUpdateLog를 메모리 버퍼에 쌓음
   */
  private bufferUpdate(categoryId: string, update: Uint8Array) {
    if (!this.updateBuffer.has(categoryId)) {
      this.updateBuffer.set(categoryId, [])
    }
    this.updateBuffer.get(categoryId)!.push(update)
  }

  /**
   * YjsUpdateLog 버퍼 내용을 병합하여 DB에 저장 (Flush)
   */
  private async flushBufferToDB() {
    if (this.updateBuffer.size === 0) return

    // 현재 버퍼의 스냅샷을 뜨고 맵을 비움 (동시성 이슈 방지)
    const currentBuffer = new Map(this.updateBuffer)
    this.updateBuffer.clear()

    for (const [categoryId, updates] of currentBuffer.entries()) {
      if (updates.length === 0) continue

      try {
        // Y.js의 핵심 기능: 여러 업데이트를 하나로 병합
        const mergedUpdate = Y.mergeUpdates(updates)

        // 병합된 하나만 DB에 저장
        await this.canvasService.saveUpdateLog(categoryId, mergedUpdate)

        console.log(`[Yjs] Flushed ${updates.length} updates for category ${categoryId}`)
      } catch (err) {
        console.error(`[Yjs] Failed to flush buffer for ${categoryId}`, err)
        // TODO: 만약 flush 실패 시 다시 버퍼에 넣거나, 재시도 큐에 넣는 로직 필요
      }
    }
  }
}
