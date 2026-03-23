'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ShoppingCart, Search, Calendar, TrendingUp, Package } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface Sale {
  id: string
  productId: string
  productName: string
  quantity: number
  createdAt: string
}

interface Props {
  shopId: string
}

export default function SalesList({ shopId }: Props) {
  const { t } = useLanguage()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('all')

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('Sales')
        .select('*, product:Product(name)')
        .eq('shopId', shopId)
        .order('createdAt', { ascending: false })
        .limit(500)

      if (!error && data) {
        setSales(data.map((s: any) => ({
          id: s.id,
          productId: s.productId,
          productName: s.product?.name || 'Unknown',
          quantity: s.quantity,
          createdAt: s.createdAt,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch sales', err)
    }
    setLoading(false)
  }, [shopId])

  useEffect(() => { fetchSales() }, [fetchSales])

  const filteredSales = useMemo(() => {
    let result = sales

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0)
      else if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7)
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30)
      result = result.filter(s => new Date(s.createdAt) >= cutoff)
    }

    // Search filter
    if (searchTerm) {
      result = result.filter(s => s.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return result
  }, [sales, dateFilter, searchTerm])

  const totalQty = useMemo(() => filteredSales.reduce((s, x) => s + x.quantity, 0), [filteredSales])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-600" />
            {t.sales} History
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Track all your sold items.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 outline-none w-full" />
          </div>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 text-xs font-bold">
            {(['today', '7d', '30d', 'all'] as const).map(f => (
              <button key={f} onClick={() => setDateFilter(f)} className={`px-3.5 py-2.5 transition-all ${dateFilter === f ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {f === 'today' ? 'Today' : f === '7d' ? '7 Days' : f === '30d' ? '30 Days' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-bold">Total Transactions</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{filteredSales.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-bold">Units Sold</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{totalQty}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold">Avg per Sale</span>
          </div>
          <p className="text-2xl font-black text-blue-600">{filteredSales.length > 0 ? (totalQty / filteredSales.length).toFixed(1) : '0'}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="py-16 text-center text-slate-500 font-medium bg-white border border-dashed border-slate-300 rounded-2xl">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-600">No sales found</p>
          <p className="text-sm mt-1">Sell items from your dashboard to see history here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{s.productName}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{s.quantity}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{formatTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
