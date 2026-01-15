import { PrismaService } from '@/lib/prisma/prisma.service'
import { YjsDocument } from './yjs.type'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import * as Y from 'yjs'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'

@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

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
      void this.flushBufferToDB().catch()
    }, 5000)
  }

  onModuleDestroy() {
    // 서버 종료 시 남은 데이터 강제 저장
    clearInterval(this.saveInterval)
    void this.flushBufferToDB().catch()
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
    const initialUpdate = await this.getMergedUpdate(categoryId)
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
   * 캔버스 접속 초기화 로직 통합
   * 1. 문서 가져오기 (DB or Memory)
   * 2. 클라이언트 접속 등록
   * 3. 초기 동기화 데이터(StateVector) 반환
   */
  async initializeConnection(roomId: string, categoryId: string, socketId: string) {
    // 1. 문서 확보
    const doc = await this.getOrCreateDocument(roomId, categoryId)

    // 2. 접속자 등록
    this.connectClient(categoryId, socketId)

    // 3. 응답 데이터 생성
    const stateVector = encodeStateAsUpdate(doc)
    const docKey = `${roomId}-${categoryId}`

    return {
      docKey,
      update: stateVector ? Array.from(stateVector) : undefined,
    }
  }

  /**
   * [Refactor] 업데이트 처리 로직
   * 1. 메모리 문서에 적용
   * 2. 버퍼에 담기 (배치 저장용)
   */
  processUpdate(categoryId: string, update: Uint8Array): boolean {
    const yjsDoc = this.documents.get(categoryId)
    if (!yjsDoc) return false

    try {
      // 1. 메모리 적용
      applyUpdate(yjsDoc.doc, update)

      // 2. 업데이트 로그 버퍼링
      this.bufferUpdate(categoryId, update)

      return true
    } catch (error) {
      console.error('Failed to apply Yjs update:', error)
      return false
    }
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
        await this.saveUpdateLog(categoryId, mergedUpdate)

        console.log(`[Yjs] Flushed ${updates.length} updates for category ${categoryId}`)
      } catch (err) {
        console.error(`[Yjs] Failed to flush buffer for ${categoryId}`, err)
        // TODO: 만약 flush 실패 시 다시 버퍼에 넣거나, 재시도 큐에 넣는 로직 필요
      }
    }
  }

  // 초기 데이터 로드 (DB -> Merged Uint8Array)
  private async getMergedUpdate(categoryId: string): Promise<Uint8Array> {
    const logs = await this.prisma.categoryUpdateLog.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    })

    if (logs.length === 0) return new Uint8Array()

    const updates = logs.map(log => new Uint8Array(log.updateData))
    return Y.mergeUpdates(updates)
  }

  // 업데이트 로그 저장 (Uint8Array -> DB)
  private async saveUpdateLog(canvasId: string, update: Uint8Array) {
    console.log('DB에 log 저장')
    await this.prisma.categoryUpdateLog.create({
      data: {
        categoryId: canvasId,
        updateData: Buffer.from(update),
      },
    })
  }
}
