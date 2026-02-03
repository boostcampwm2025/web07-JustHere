export class CanvasAttachPayload {
  roomId!: string
  canvasId!: string
}

export class CanvasDetachPayload {
  canvasId!: string
}

export class YjsUpdatePayload {
  canvasId!: string
  update!: number[]
}

export class CursorInfo {
  x!: number
  y!: number
  name!: string
}

export class AwarenessState {
  cursor?: CursorInfo
}

export class YjsAwarenessPayload {
  canvasId!: string
  state!: AwarenessState
}
