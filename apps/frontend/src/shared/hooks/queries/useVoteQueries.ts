import { useQuery } from '@tanstack/react-query'
import { getVoteResults } from '@/shared/api'

export const voteQueryKeys = {
  base: () => ['vote', 'results'] as const,
  results: (roomId: string) => ['vote', 'results', roomId] as const,
}

export const useVoteResults = (roomId: string, ready: boolean) => {
  return useQuery({
    queryKey: voteQueryKeys.results(roomId),
    queryFn: () => getVoteResults(roomId),
    enabled: !!roomId && ready,
  })
}
