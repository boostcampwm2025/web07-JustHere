import * as Y from 'yjs'

export interface YjsDocument {
  doc: Y.Doc
  roomId: string
  categoryId: string
  connections: Set<string> // socketId들
}
