import { Skeleton } from '@/shared/components'

export const PlaceItemSkeleton = () => {
  return (
    <div className="flex gap-3 p-2 -m-2">
      <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col justify-between py-0.5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <div className="flex items-center justify-end gap-2 mt-1">
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
        </div>
      </div>
    </div>
  )
}
