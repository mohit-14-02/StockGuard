'use client'

import UserMenu from '@/components/layout/UserMenu'
import { Search } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export default function TopHeader() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-2.5 h-16 flex items-center justify-between">
      <div className="flex-1 max-w-xl hidden sm:block relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
        <input 
          type="text" 
          placeholder={t.searchProduct || "Search inventory..."} 
          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/10 rounded-xl text-sm transition-all outline-none dark:text-slate-200"
        />
      </div>
      
      <div className="md:hidden flex items-center gap-2">
         {/* Hamburger is in Sidebar already, but we need some logo/space here if needed */}
         <span className="font-bold text-orange-600 ml-10">StockGuard</span>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  )
}
