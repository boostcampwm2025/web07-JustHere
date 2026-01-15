import { createRandomUser } from '@/utils/randomUser'

export interface StoredUser {
  userId: string
  name: string
}

const USER_STORAGE_KEY_PREFIX = 'justhere.user'

const getUserStorageKey = (roomSlug: string) => `${USER_STORAGE_KEY_PREFIX}.${roomSlug}`

const loadStoredUser = (roomSlug: string): StoredUser | null => {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(getUserStorageKey(roomSlug))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredUser
    if (!parsed?.userId || !parsed?.name) return null
    return parsed
  } catch {
    return null
  }
}

const saveStoredUser = (roomSlug: string, user: StoredUser) => {
  localStorage.setItem(getUserStorageKey(roomSlug), JSON.stringify(user))
}

export const getOrCreateStoredUser = (roomSlug: string): StoredUser => {
  const stored = loadStoredUser(roomSlug)
  if (stored) return stored

  const created = createRandomUser()
  saveStoredUser(roomSlug, created)
  return created
}
