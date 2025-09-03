import { cn } from '../../lib/cn'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }
export function Button({ className, variant='primary', size='md', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-9 px-4 text-sm', lg: 'h-10 px-5 text-base' }
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-600',
    outline: 'border border-white/20 hover:bg-white/5',
    ghost: 'hover:bg-white/5',
  }
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
}

