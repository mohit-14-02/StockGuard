'use client'

import { Package, TrendingDown, DollarSign, AlertCircle, Skull } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface DashboardWidgetsProps {
  itemsSoldToday: number
  lowStockCount: number
  restockAlerts: number
  currentInventoryCount: number
  expiredCount?: number
}

export default function DashboardWidgets({ 
  itemsSoldToday, 
  lowStockCount, 
  restockAlerts, 
  currentInventoryCount,
  expiredCount = 0,
}: DashboardWidgetsProps) {
  const { t } = useLanguage()
  
  const widgets = [
    { 
      title: t.totalStock,
      value: currentInventoryCount, 
      icon: <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />, 
      bg: "bg-linear-to-br from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20",
      iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
      textColor: "text-orange-900 dark:text-orange-300",
      borderColor: "border-orange-200/60 dark:border-orange-800/30"
    },
    { 
      title: t.soldToday,
      value: itemsSoldToday, 
      icon: <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, 
      bg: "bg-linear-to-br from-emerald-100 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      textColor: "text-emerald-900 dark:text-emerald-300",
      borderColor: "border-emerald-200/60 dark:border-emerald-800/30"
    },
    { 
      title: t.lowStock,
      value: lowStockCount, 
      icon: <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />, 
      bg: "bg-linear-to-br from-amber-100 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/20",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      textColor: "text-amber-900 dark:text-amber-300",
      borderColor: "border-amber-200/60 dark:border-amber-800/30"
    },
    { 
      title: t.restockAlert,
      value: restockAlerts, 
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />, 
      bg: "bg-linear-to-br from-red-100 to-rose-50 dark:from-red-950/40 dark:to-rose-950/20",
      iconBg: "bg-red-500/10 dark:bg-red-500/20",
      textColor: "text-red-900 dark:text-red-300",
      borderColor: "border-red-200/60 dark:border-red-800/30"
    },
    ...(expiredCount > 0 ? [{
      title: t.expired,
      value: expiredCount,
      icon: <Skull className="w-5 h-5 text-red-600 dark:text-red-400" />,
      bg: "bg-linear-to-br from-red-200 to-red-100 dark:from-red-900/60 dark:to-red-950/40",
      iconBg: "bg-red-700/10 dark:bg-red-700/20",
      textColor: "text-red-900 dark:text-red-300",
      borderColor: "border-red-300/60 dark:border-red-800/50"
    }] : [])
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 stagger-children">
      {widgets.map((widget, i) => (
        <div 
          key={i} 
          className={`relative overflow-hidden ${widget.bg} border ${widget.borderColor} rounded-3xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-default group`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 ${widget.iconBg} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
              {widget.icon}
            </div>
          </div>
          <p className={`text-3xl font-black ${widget.textColor} tracking-tighter`}>{widget.value}</p>
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest leading-tight">{widget.title}</p>
        </div>
      ))}
    </div>
  )
}

