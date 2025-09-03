import { cn } from '../../lib/cn'
export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn('rounded-xl border border-white/10 bg-white/5 backdrop-blur', className)} {...rest} />
}
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn('px-5 py-4 border-b border-white/10', className)} {...rest} />
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn('px-5 py-4', className)} {...rest} />
}

