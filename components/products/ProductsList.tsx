'use client'

import { useState, useMemo } from 'react'
import { Package, AlertTriangle, TrendingDown, Truck, Search, Send, Loader2, CheckCircle, PackageX, Shield, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { useProfile } from '@/lib/hooks/useProfile'

interface Product {
  id: string
  name: string
  totalStock: number
  expiredCount: number
  criticalCount: number
  safeCount: number
  batchCount: number
  lastDistributor: string | null
  lastDistributorId: string | null
  weeklySales: number
  isLowStock: boolean
  isOutOfStock: boolean
}

interface Distributor {
  id: string
  name: string
}

interface Props {
  products: Product[]
  distributors: Distributor[]
  shopId: string
}

export default function ProductsList({ products, distributors, shopId }: Props) {
  const { t } = useLanguage()
  const { profile } = useProfile()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'critical'>('all')
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = products
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    switch (filter) {
      case 'low': return result.filter(p => p.isLowStock)
      case 'out': return result.filter(p => p.isOutOfStock)
      case 'critical': return result.filter(p => p.criticalCount > 0 || p.expiredCount > 0)
      default: return result
    }
  }, [products, searchTerm, filter])

  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(p => p.isLowStock).length,
    outOfStock: products.filter(p => p.isOutOfStock).length,
    critical: products.filter(p => p.criticalCount > 0 || p.expiredCount > 0).length,
  }), [products])

  const handleRestock = async (product: Product) => {
    setRestockingId(product.id)
    setRestockSuccess(null)
    try {
      const res = await fetch('/api/restock/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ name: product.name, stock: product.totalStock, limit: 10 }],
          shopName: profile?.shop_name || profile?.full_name || 'Shop',
          shopkeeperName: profile?.full_name || 'Owner',
          shopkeeperPhone: profile?.phone_number || '',
          distributorName: product.lastDistributor || 'Distributor',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRestockSuccess(product.id)
      setTimeout(() => setRestockSuccess(null), 4000)
    } catch (err: any) {
      console.error('Restock error:', err)
      alert(err.message || 'Failed to send restock notification')
    } finally {
      setRestockingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.products}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats.total} products • {stats.lowStock} low stock • {stats.outOfStock} out of stock
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => setFilter('all')} className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${filter === 'all' ? 'border-orange-300 bg-orange-50 shadow-md shadow-orange-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] font-bold text-slate-500">All Products</p>
        </button>

        <button onClick={() => setFilter('low')} className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${filter === 'low' ? 'border-amber-300 bg-amber-50 shadow-md shadow-amber-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.lowStock}</p>
          <p className="text-[11px] font-bold text-slate-500">{t.lowStock}</p>
        </button>

        <button onClick={() => setFilter('out')} className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${filter === 'out' ? 'border-red-300 bg-red-50 shadow-md shadow-red-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <PackageX className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-700">{stats.outOfStock}</p>
          <p className="text-[11px] font-bold text-slate-500">Out of Stock</p>
        </button>

        <button onClick={() => setFilter('critical')} className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${filter === 'critical' ? 'border-rose-300 bg-rose-50 shadow-md shadow-rose-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700">{stats.critical}</p>
          <p className="text-[11px] font-bold text-slate-500">Expiry Risk</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all"
        />
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filtered.map(product => (
          <div
            key={product.id}
            className={`bg-white rounded-2xl border p-4 hover:shadow-lg transition-all ${
              product.isOutOfStock ? 'border-red-200 bg-red-50/30' :
              product.isLowStock ? 'border-amber-200 bg-amber-50/30' :
              'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    product.isOutOfStock ? 'bg-red-500' :
                    product.isLowStock ? 'bg-amber-500 animate-pulse' :
                    'bg-emerald-500'
                  }`} />
                  <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                  {product.isLowStock && (
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200/50 shrink-0">
                      ⚠️ LOW
                    </span>
                  )}
                  {product.isOutOfStock && (
                    <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200/50 shrink-0">
                      ❌ OUT
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                  <span>{t.totalStock}: <span className="font-bold text-slate-900">{product.totalStock}</span></span>
                  <span>Batches: <span className="font-bold text-slate-700">{product.batchCount}</span></span>
                  {product.weeklySales > 0 && (
                    <span className="flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      <span className="font-bold text-emerald-700">{product.weeklySales}</span> sold (7d)
                    </span>
                  )}
                  {product.lastDistributor && (
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-indigo-500" />
                      <span className="font-bold text-indigo-700">{product.lastDistributor}</span>
                    </span>
                  )}
                </div>

                {/* Batch status pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {product.safeCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      <Shield className="w-3 h-3" /> {product.safeCount} safe
                    </span>
                  )}
                  {product.criticalCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                      <AlertTriangle className="w-3 h-3" /> {product.criticalCount} critical
                    </span>
                  )}
                  {product.expiredCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                      ☠️ {product.expiredCount} expired
                    </span>
                  )}
                </div>
              </div>

              {/* Stock bar */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-20">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        product.isOutOfStock ? 'bg-red-500' :
                        product.isLowStock ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (product.totalStock / 50) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center mt-0.5 font-bold text-slate-400">{product.totalStock} units</p>
                </div>

                {/* Restock Button — shows for low stock and out of stock */}
                {(product.isLowStock || product.isOutOfStock) && (
                  <button
                    onClick={() => handleRestock(product)}
                    disabled={restockingId === product.id || restockSuccess === product.id}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm ${
                      restockSuccess === product.id
                        ? 'bg-emerald-500 text-white shadow-emerald-200/50'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-200/50'
                    } disabled:opacity-60`}
                  >
                    {restockingId === product.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : restockSuccess === product.id ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Restock
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500 text-sm">
              {searchTerm ? 'No products match your search' : 'No products added yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? 'Try a different search term' : 'Add products from the dashboard to see them here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
