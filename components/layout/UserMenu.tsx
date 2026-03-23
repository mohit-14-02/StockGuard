'use client'

import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Moon, Sun, ChevronDown } from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'
import { useTheme } from '@/lib/ThemeContext'
import { useLanguage } from '@/lib/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const { profile } = useProfile()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      // Also clear legacy session
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const initials = (profile?.full_name || profile?.shop_name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-orange-200/50 dark:shadow-orange-900/30">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">
            {profile?.full_name || profile?.shop_name || 'User'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate max-w-[120px]">
            {profile?.shop_name || profile?.business_category || ''}
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/60 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {profile?.shop_name || 'StockGuard'}
            </p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => { toggleTheme(); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="font-medium">Dark Mode</span>
              </>
            )}
          </button>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-slate-100 dark:border-slate-700 disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="font-medium">{loggingOut ? 'Signing out...' : t.signOut}</span>
          </button>
        </div>
      )}
    </div>
  )
}
