// yjs/yjs.service.ts
import { Injectable } from '@nestjs/common'
import * as Y from 'yjs'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'

interface YjsDocument {
  doc: Y.Doc
  roomId: string
  categoryId: string
  connections: Set<string> // socketId들
}

@Injectable()
export class YjsService {
  // categoryId -> YjsDocument 매핑
  private documents = new Map<string, YjsDocument>()

  /**
   * Category용 Yjs 문서 생성 또는 가져오기
   */
  getOrCreateDocument(roomId: string, categoryId: string): Y.Doc {
    const existing = this.documents.get(categoryId)
    if (existing) return existing.doc

    const doc = new Y.Doc()
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
}
