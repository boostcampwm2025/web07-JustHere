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

export class CursorPosition {
  x!: number
  y!: number
}

export class AwarenessState {
  cursor?: CursorPosition
}

export class YjsAwarenessPayload {
  canvasId!: string
  state!: AwarenessState
}
