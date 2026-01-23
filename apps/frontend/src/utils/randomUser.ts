import type { User } from '@/types/domain'

const COLORS = ['빨간', '파란', '초록', '노란', '보라', '하얀', '검은', '주황', '분홍', '갈색']
const FOODS = ['돈까스', '비빔밥', '라면', '떡볶이', '김치찌개', '불고기', '초밥', '만두', '갈비', '파스타']

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

export const createRandomUser = (): User => {
  const name = `${pick(COLORS)} ${pick(FOODS)}`

  return {
    userId: crypto.randomUUID(),
    name,
  }
}
