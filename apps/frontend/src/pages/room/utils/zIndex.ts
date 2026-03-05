import type { Map as YMap } from 'yjs'
import type { YjsItemType, YjsRank } from '@/pages/room/types'
import { parseKey } from '@/pages/room/utils'

type ZIndexState = {
  items: YjsItemType[]
  maxTimestamp: number
}

export const resolveZIndexState = (rankByKey: YMap<YjsRank>, currentMaxTimestamp: number): ZIndexState => {
  const entries: Array<{ rank: YjsRank; parsed: YjsItemType | null }> = []
  let maxTimestamp = currentMaxTimestamp

  rankByKey.forEach((rank, key) => {
    if (rank?.timestamp != null) {
      maxTimestamp = Math.max(maxTimestamp, rank.timestamp)
    }
    entries.push({
      rank: rank ?? { timestamp: 0, clientId: 0 },
      parsed: parseKey(key),
    })
  })

  entries.sort((a, b) => {
    if (a.rank.timestamp !== b.rank.timestamp) return a.rank.timestamp - b.rank.timestamp
    return a.rank.clientId - b.rank.clientId
  })

  return {
    items: entries.flatMap(entry => (entry.parsed ? [entry.parsed] : [])),
    maxTimestamp,
  }
}

export const assignNextRank = (rankByKey: YMap<YjsRank>, key: string, currentMaxTimestamp: number, clientId: number): number => {
  const nextTimestamp = currentMaxTimestamp + 1
  rankByKey.set(key, { timestamp: nextTimestamp, clientId })

  return nextTimestamp
}

export const shouldSkipMoveToTop = (rankByKey: YMap<YjsRank>, current: YjsRank | undefined, maxTimestamp: number): boolean => {
  if (!current || current.timestamp !== maxTimestamp) return false

  let minClientId = current.clientId
  rankByKey.forEach(rank => {
    if (rank?.timestamp === maxTimestamp && rank.clientId < minClientId) {
      minClientId = rank.clientId
    }
  })

  return current.clientId === minClientId
}
