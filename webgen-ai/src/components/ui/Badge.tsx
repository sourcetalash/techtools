import { cn } from '../../lib/cn'
export function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs', className)}>{children}</span>
}

