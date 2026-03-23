'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Users, Search, Star, AlertTriangle, X, Phone, Mail, Truck } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface Distributor {
  id: string
  name: string
  phone?: string
  email?: string
  totalReturns: number
  accepted: number
  rejected: number
  reliabilityScore: number
  hasEscalation: boolean
}

interface Props {
  shopId: string
}

export default function DistributorList({ shopId }: Props) {
  const { t } = useLanguage()
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchDistributors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/distributors`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setDistributors(data)
      }
    } catch (err) {
      console.error('Failed to fetch distributors', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDistributors()
  }, [fetchDistributors])

  const handleAdd = async () => {
    if (!addName.trim()) return
    setAdding(true)
    try {
      const { error } = await supabase.from('Distributor').insert({
        shopId,
        name: addName.trim(),
        phone: addPhone.trim() || null,
        email: addEmail.trim() || null,
      })
      if (error) throw error
      setAddName('')
      setAddPhone('')
      setAddEmail('')
      setShowAddModal(false)
      fetchDistributors()
    } catch (err: any) {
      alert(err.message)
    }
    setAdding(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove distributor "${name}"?`)) return
    try {
      await supabase.from('Distributor').delete().eq('id', id).eq('shopId', shopId)
      setDistributors(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const filtered = distributors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (score >= 0.5) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            {t.distributors}
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage your suppliers and view reliability scores.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 outline-none w-full"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-orange-200"
          >
            <Plus className="w-4 h-4" /> Add Distributor
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Add Distributor</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Distributor name" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="+91..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="email@example.com" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleAdd} disabled={adding || !addName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 font-medium bg-white border border-dashed border-slate-300 rounded-2xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-600">{t.noDistributors}</p>
          <p className="text-sm mt-1">Add your first distributor to start tracking returns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className={`bg-white border rounded-2xl p-5 hover:shadow-lg transition-all ${d.hasEscalation ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-lg">
                    {d.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{d.name}</h3>
                    {d.hasEscalation && (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Escalation
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(d.id, d.name)} className="text-slate-300 hover:text-red-500 text-xs transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${getScoreColor(d.reliabilityScore)}`}>
                  <Star className="w-3.5 h-3.5" />
                  {(d.reliabilityScore * 100).toFixed(0)}% Reliable
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-lg font-black text-slate-800">{d.totalReturns}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{t.totalReturns}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2">
                  <p className="text-lg font-black text-emerald-600">{d.accepted}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">{t.accepted}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2">
                  <p className="text-lg font-black text-red-600">{d.rejected}</p>
                  <p className="text-[10px] text-red-600 font-medium">{t.rejected}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
