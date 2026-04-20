export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
      <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <SkeletonLoader className="h-4 w-3/4" />
      <SkeletonLoader className="h-3 w-1/2" />
      <SkeletonLoader className="h-20 w-full" />
      <SkeletonLoader className="h-8 w-24" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <SkeletonLoader className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <SkeletonLoader className="h-8 w-1/4" />
          <SkeletonLoader className="h-8 w-1/3" />
          <SkeletonLoader className="h-8 w-1/4" />
          <SkeletonLoader className="h-8 w-1/6" />
        </div>
      ))}
    </div>
  )
}
