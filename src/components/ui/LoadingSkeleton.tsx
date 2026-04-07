import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

// 단일 스켈레톤 블록
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded bg-gray-200",
        className
      )}
      aria-hidden="true"
    />
  );
}

// 달력 전체 로딩 스켈레톤
export function CalendarSkeleton() {
  return (
    <div className="w-full" aria-label="달력 로딩 중">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>

      {/* 요일 헤더 스켈레톤 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>

      {/* 날짜 셀 스켈레톤 (6행 × 7열) */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-28" />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
