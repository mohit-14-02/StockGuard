'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Mic, MicOff, RefreshCw, AlertTriangle, Package, Search, Plus, X, Trash2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface ProductStock {
  id: string
  name: string
  totalStock: number
}

interface Props {
  shopId: string
}

export default function ProductList({ shopId }: Props) {
  const { t } = useLanguage()
  const [products, setProducts] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Add Product state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [adding, setAdding] = useState(false)

  // Voice Input State
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data: prods } = await supabase
      .from('Product')
      .select('id, name')
      .eq('shopId', shopId)

    if (prods && prods.length > 0) {
      const productIds = prods.map(p => p.id)
      const { data: batches } = await supabase
        .from('Batch')
        .select('productId, quantity')
        .in('productId', productIds)

      const stockMap: Record<string, number> = {}
      batches?.forEach(b => {
        stockMap[b.productId] = (stockMap[b.productId] || 0) + b.quantity
      })

      const formatted = prods.map(p => ({
        id: p.id,
        name: p.name,
        totalStock: stockMap[p.id] || 0
      }))

      formatted.sort((a, b) => {
        if (a.totalStock <= 10 && b.totalStock > 10) return -1
        if (b.totalStock <= 10 && a.totalStock > 10) return 1
        return a.name.localeCompare(b.name)
      })

      setProducts(formatted)
    } else {
      setProducts([])
    }
    setLoading(false)
  }, [shopId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Real-time subscription for batch changes → auto-refresh stock
  useEffect(() => {
    const channel = supabase
      .channel('product-stock-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Batch' }, () => {
        fetchProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Product' }, () => {
        fetchProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProducts])

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return
    setAdding(true)
    try {
      const { error } = await supabase.from('Product').insert({
        shopId,
        name: newProductName.trim(),
      })
      if (error) throw error
      setNewProductName('')
      setShowAddModal(false)
      fetchProducts()
    } catch (err: any) {
      alert(err.message)
    }
    setAdding(false)
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Delete product "${productName}"? This will also remove all batches.`)) return
    setDeletingId(productId)
    try {
      // Delete batches first, then product
      await supabase.from('Batch').delete().eq('productId', productId)
      await supabase.from('Product').delete().eq('id', productId).eq('shopId', shopId)
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (err: any) {
      alert(err.message)
    }
    setDeletingId(null)
  }

  const handleRestock = async (productId: string, productName: string, qty?: number) => {
    setRestockingId(productId)
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: qty,
          currentStock: products.find(p => p.id === productId)?.totalStock
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to restock')
      alert(`Restock notification for ${productName} sent to distributor!`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRestockingId(null)
    }
  }

  // Voice recognition
  const recognitionRef = { current: null as any }

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript
      setTranscript(speechToText)
      parseSpeechCommand(speechToText)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const parseSpeechCommand = (text: string) => {
    const match = text.match(/restock\s+(\d+)?\s*(.*)/i)
    if (match) {
      const qty = match[1] ? parseInt(match[1]) : undefined
      let itemName = match[2]?.trim().toLowerCase()

      if (itemName) {
        itemName = itemName.replace(/(packets|boxes|pieces|bottles|units)$/i, '').trim()
        const foundProduct = products.find(p =>
          p.name.toLowerCase().includes(itemName) || itemName.includes(p.name.toLowerCase())
        )
        if (foundProduct) {
          if (confirm(`Restock ${qty ? qty + ' units of ' : ''}${foundProduct.name}?`)) {
            handleRestock(foundProduct.id, foundProduct.name, qty)
          }
        } else {
          alert(`Could not find product matching "${itemName}". Try using the manual Restock button.`)
        }
      }
    } else {
      alert(`Could not parse: "${text}"\nTry saying "Restock 20 Rice"`)
    }
  }

  const filtered = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [products, searchTerm])

  const lowStockProducts = useMemo(() => filtered.filter(p => p.totalStock <= 10), [filtered])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600" />
            {t.products} & Restock
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {products.length} products · {lowStockProducts.length} low stock
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 outline-none w-full transition-all font-medium" />
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-200 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Product
          </button>
          <button onClick={toggleSpeechRecognition} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all w-full sm:w-auto ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-900 shadow-md hover:shadow-lg'}`}>
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Stop' : 'Voice'}
          </button>
        </div>
      </div>

      {/* Voice transcript */}
      {transcript && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <Mic className="w-4 h-4 text-blue-600" />
          Heard: &quot;{transcript}&quot;
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Add Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.productName}</label>
              <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="e.g. Paracetamol 500mg" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddProduct()} />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={handleAddProduct} disabled={adding || !newProductName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const isLowStock = p.totalStock <= 10
            return (
              <div key={p.id} className={`bg-white border rounded-2xl p-5 hover:shadow-lg transition-all ${isLowStock ? 'border-amber-300 shadow-amber-100' : 'border-slate-200 shadow-slate-100'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-lg truncate" title={p.name}>{p.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm">
                      <span className="text-slate-500">{t.totalStock}:</span>
                      <span className={`font-black ${isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>{p.totalStock}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isLowStock && (
                      <div className="bg-amber-100 w-8 h-8 flex items-center justify-center rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                    )}
                    <button onClick={() => handleDeleteProduct(p.id, p.name)} disabled={deletingId === p.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                      {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="w-20 hidden sm:block">
                    <input type="number" id={`qty-${p.id}`} placeholder="Qty" min="1" className="w-full pl-2 pr-1 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-center" />
                  </div>
                  <button disabled={restockingId === p.id} onClick={() => {
                    const qtyInput = document.getElementById(`qty-${p.id}`) as HTMLInputElement
                    const qty = qtyInput && qtyInput.value ? parseInt(qtyInput.value) : undefined
                    handleRestock(p.id, p.name, qty)
                  }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${isLowStock ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'}`}>
                    {restockingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Restock
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-600">{t.noProducts}</p>
              <p className="text-sm mt-1">Use &quot;Add Product&quot; to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
