'use client'

interface Props {
  data: { atRisk: number; recovered: number; lost: number; atRiskCount: number }
}

import { useLanguage } from '@/lib/LanguageContext'

export default function LossCalculator({ data }: Props) {
  const { t } = useLanguage()
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
      {/* At Risk */}
      <div className="relative overflow-hidden bg-linear-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10 border border-red-200/60 dark:border-red-800/30 rounded-3xl p-6 group hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-red-400/20 transition-colors" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
            <p className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest">{t.atRisk}</p>
          </div>
          <p className="text-4xl font-black text-red-700 dark:text-red-500 tracking-tighter drop-shadow-sm">{fmt(data.atRisk)}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200/50 dark:border-red-800/50">
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">{data.atRiskCount} {t.atRiskItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recovered */}
      <div className="relative overflow-hidden bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border border-emerald-200/60 dark:border-emerald-800/30 rounded-3xl p-6 group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-emerald-400/20 transition-colors" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{t.recovered}</p>
          </div>
          <p className="text-4xl font-black text-emerald-700 dark:text-emerald-500 tracking-tighter drop-shadow-sm">{fmt(data.recovered)}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Efficiency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lost */}
      <div className="relative overflow-hidden bg-linear-to-br from-slate-50 to-gray-100 dark:from-slate-900/40 dark:to-slate-900/20 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 group hover:shadow-2xl hover:shadow-slate-500/5 transition-all duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/10 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-slate-400/20 transition-colors" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{t.lost}</p>
          </div>
          <p className="text-4xl font-black text-slate-700 dark:text-slate-300 tracking-tighter drop-shadow-sm">{fmt(data.lost)}</p>
          <div className="mt-2.5 flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <p className="text-[10px] font-bold uppercase tracking-tighter">Inventory Waste</p>
          </div>
        </div>
      </div>
    </div>
  )
}
