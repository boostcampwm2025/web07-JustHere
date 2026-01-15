// [S->C] category:created
export type CategoryCreatedPayload = {
  categoryId: string
  name: string
}

// [S->C] category:deleted
export type CategoryDeletedPayload = {
  categoryId: string
}

// [S->C] category:error
export type CategoryErrorPayload = {
  code: string
  message: string
}
