import { createRandomUser } from '@/utils/randomUser'

export interface StoredUser {
  userId: string
  name: string
}

const USER_STORAGE_KEY = 'justhere.user'

const loadStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredUser
    if (!parsed?.userId || !parsed?.name) return null
    return parsed
  } catch {
    return null
  }
}

const saveStoredUser = (user: StoredUser) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export const getOrCreateStoredUser = (): StoredUser => {
  const stored = loadStoredUser()
  if (stored) return stored

  const created = createRandomUser()
  saveStoredUser(created)
  return created
}
