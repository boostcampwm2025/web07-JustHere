// [S->C] category:created
export type CategoryCreatedPayload = {
  category_id: string
  room_id: string
  name: string
  order: number
  created_at: Date
}

// [S->C] category:deleted
export type CategoryDeletedPayload = {
  category_id: string
  deleted_at: Date
}
