import type { User } from '@/types/domain'
import { createRandomUser } from '@/utils/randomUser'

const USER_STORAGE_KEY_PREFIX = 'justhere.user'

const getUserStorageKey = (roomSlug: string) => `${USER_STORAGE_KEY_PREFIX}.${roomSlug}`

const loadStoredUser = (roomSlug: string): User | null => {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(getUserStorageKey(roomSlug))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as User
    if (!parsed?.userId || !parsed?.name) return null
    return parsed
  } catch {
    return null
  }
}

const saveStoredUser = (roomSlug: string, user: User) => {
  localStorage.setItem(getUserStorageKey(roomSlug), JSON.stringify(user))
}

export const getOrCreateStoredUser = (roomSlug: string): User => {
  const stored = loadStoredUser(roomSlug)
  if (stored) return stored

  const created = createRandomUser()
  saveStoredUser(roomSlug, created)
  return created
}

export const updateStoredUserName = (roomSlug: string, name: string) => {
  const stored = loadStoredUser(roomSlug)
  if (!stored) return

  saveStoredUser(roomSlug, { ...stored, name })
}
