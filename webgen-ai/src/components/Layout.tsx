import { Link } from 'react-router-dom'
import { setTheme, getStoredTheme } from '../theme'

export default function Layout({ children }: { children: React.ReactNode }) {
  function toggleTheme() {
    const current = getStoredTheme() || 'dark'
    setTheme(current === 'dark' ? 'light' : 'dark')
  }
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b1020]/70">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">WebGen AI</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/select" className="hover:underline">Create</Link>
            <button onClick={toggleTheme} className="rounded-md border border-neutral-200 dark:border-white/10 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-white/5">Theme</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 md:px-6 py-6">{children}</main>
    </div>
  )
}

