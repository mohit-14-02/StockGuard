'use client'

import { useState, useMemo } from 'react'
import { Truck, Search, CheckCircle, XCircle, Clock, AlertTriangle, Package, Shield, Star, Phone } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface DistributorData {
  id: string
  name: string
  totalReturns: number
  accepted: number
  rejected: number
  pending: number
  reliabilityScore: number
  hasEscalation: boolean
  productsSupplied: string[]
  totalSupplied: number
}

interface Props {
  distributors: DistributorData[]
  shopId: string
}

export default function DistributorsList({ distributors, shopId }: Props) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    if (!searchTerm) return distributors
    return distributors.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.productsSupplied.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [distributors, searchTerm])

  const stats = useMemo(() => ({
    total: distributors.length,
    reliable: distributors.filter(d => d.reliabilityScore >= 0.8).length,
    escalated: distributors.filter(d => d.hasEscalation).length,
    pendingReturns: distributors.reduce((sum, d) => sum + d.pending, 0),
  }), [distributors])

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 0.5) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-400'
    if (score >= 0.5) return 'bg-amber-400'
    return 'bg-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.distributors}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {stats.total} distributors • {stats.reliable} reliable • {stats.pendingReturns} pending returns
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center mb-2">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] font-bold text-slate-500">Total Distributors</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center mb-2">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.reliable}</p>
          <p className="text-[11px] font-bold text-slate-500">{t.reliable}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-red-700">{stats.escalated}</p>
          <p className="text-[11px] font-bold text-slate-500">Escalated</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.pendingReturns}</p>
          <p className="text-[11px] font-bold text-slate-500">Pending Returns</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search distributors or products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all"
        />
      </div>

      {/* Distributors List */}
      <div className="space-y-3">
        {filtered.map(dist => (
          <div key={dist.id} className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all ${
            dist.hasEscalation ? 'border-red-200' : 'border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
                  dist.hasEscalation ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {dist.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                    {dist.name}
                    {dist.hasEscalation && (
                      <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">
                        ⚠️ ESCALATED
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {dist.totalSupplied} units supplied
                    </span>
                    {dist.productsSupplied.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        • {dist.productsSupplied.length} products
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reliability Score */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBarColor(dist.reliabilityScore)}`}
                        style={{ width: `${dist.reliabilityScore * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${getScoreColor(dist.reliabilityScore)}`}>
                      {Math.round(dist.reliabilityScore * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">Reliability</p>
                </div>

                {/* Return Stats */}
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="text-sm font-black text-emerald-600">{dist.accepted}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" /> OK
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-red-600">{dist.rejected}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <XCircle className="w-2.5 h-2.5" /> Rej
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-amber-600">{dist.pending}</p>
                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> Pen
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Products supplied */}
            {dist.productsSupplied.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Products Supplied</p>
                <div className="flex flex-wrap gap-1.5">
                  {dist.productsSupplied.map((pName, i) => (
                    <span key={i} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {pName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500 text-sm">
              {searchTerm ? 'No distributors match your search' : 'No distributors yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? 'Try a different search term' : 'Distributors are added automatically when you add batches with distributor names'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
