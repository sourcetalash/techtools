import { cn } from '../../lib/cn'
type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn('w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder-white/40 focus:ring-2 focus:ring-blue-500', className)}
      {...props}
    />
  )
}

