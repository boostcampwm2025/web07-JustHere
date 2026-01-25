import type { User } from '@/shared/types/domain'

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

const COLORS = ['빨간', '파란', '초록', '노란', '보라', '하얀', '검은', '주황', '분홍', '갈색']
const FOODS = ['돈까스', '비빔밥', '라면', '떡볶이', '김치찌개', '불고기', '초밥', '만두', '갈비', '파스타']

const createRandomUser = (): User => {
  const name = `${pick(COLORS)} ${pick(FOODS)}`

  return {
    userId: crypto.randomUUID(),
    name,
  }
}

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]
