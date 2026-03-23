'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Loader2, ScanLine, Camera, CheckCircle2, X, Package } from 'lucide-react'

interface Props {
  shopId: string
  defaultMode?: 'add' | 'sell'
  disableScanner?: boolean
  forceScan?: boolean
  onSuccess?: () => void
}

interface ScannedProduct {
  barcode: string
  productName: string
  brand: string | null
  category: string | null
  imageUrl: string | null
}

export default function BarcodeScanner({
  shopId,
  defaultMode = 'add',
  disableScanner = false,
  forceScan = false,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<'add' | 'sell'>(defaultMode)
  const [step, setStep] = useState<'idle' | 'scanning' | 'loading' | 'form' | 'success'>('idle')
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [productName, setProductName] = useState('')
  const [form, setForm] = useState({ batchNumber: '', expiryDate: '', quantity: '1', purchasePrice: '', distributorName: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = useRef(`reader-${Math.random().toString(36).slice(2)}`)

  // Auto-start scanner if forceScan is true
  useEffect(() => {
    if (forceScan && !disableScanner) {
      startScanner()
    }
    return () => { cleanupScanner() }
  }, [])

  // If disableScanner, go straight to form for manual entry
  useEffect(() => {
    if (disableScanner) {
      setStep('form')
    }
  }, [disableScanner])

  const cleanupScanner = useCallback(() => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => { }).finally(() => {
          try { scannerRef.current?.clear() } catch { }
          scannerRef.current = null
        })
      } else {
        try { scannerRef.current.clear() } catch { }
        scannerRef.current = null
      }
    }
  }, [])

  const startScanner = useCallback(async () => {
    setErrorMsg('')
    setStep('scanning')

    // Small delay to let the div render
    await new Promise(r => setTimeout(r, 100))

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId.current)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          // Barcode detected! Stop scanning and lookup
          cleanupScanner()
          setStep('loading')
          await lookupProduct(decodedText)
        },
        () => { } // Ignore scan failure frames
      )
    } catch (err) {
      console.error('Scanner start error:', err)
      setErrorMsg('Could not access camera. Please check permissions.')
      setStep('idle')
    }
  }, [cleanupScanner])

  const stopScanning = useCallback(() => {
    cleanupScanner()
    setStep('idle')
  }, [cleanupScanner])

  const lookupProduct = async (barcode: string) => {
    try {
      const res = await fetch(`/api/barcode?code=${barcode}`)
      const data = await res.json()

      if (data.productName) {
        setScannedProduct({
          barcode,
          productName: data.productName,
          brand: data.brand || null,
          category: data.category || null,
          imageUrl: data.imageUrl || null,
        })
        setProductName(data.productName)
        setStep('form')
      } else {
        setScannedProduct({ barcode, productName: '', brand: null, category: null, imageUrl: null })
        setProductName('')
        setErrorMsg(`No product found for barcode: ${barcode}. Enter details manually.`)
        setStep('form')
      }
    } catch {
      setErrorMsg('Failed to lookup barcode. Please try again.')
      setStep('idle')
    }
  }

  const handleSubmit = async () => {
    if (!productName.trim()) {
      setErrorMsg('Product name is required')
      return
    }
    setLoading(true)
    setErrorMsg('')

    try {
      if (mode === 'add') {
        if (!form.expiryDate) {
          setErrorMsg('Expiry date is required')
          setLoading(false)
          return
        }
        const res = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId,
            productName,
            batchNumber: form.batchNumber || undefined,
            expiryDate: form.expiryDate,
            quantity: parseInt(form.quantity) || 1,
            purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
            distributorName: form.distributorName || undefined,
          }),
        })
        if (res.status === 401) {
          throw new Error('Unauthorized: Shop context missing. Please ensure your shop name is set in Profile.')
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to add stock')
        }
      } else {
        const res = await fetch('/api/remove-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId,
            productName,
            quantity: parseInt(form.quantity) || 1,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to remove stock')
      }

      setStep('success')
      setTimeout(() => {
        resetForm()
        if (onSuccess) onSuccess()
        else window.location.reload()
      }, 1200)
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setScannedProduct(null)
    setProductName('')
    setForm({ batchNumber: '', expiryDate: '', quantity: '1', purchasePrice: '', distributorName: '' })
    setErrorMsg('')
    setStep('idle')
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-4">
      {/* Mode Toggle */}
      {!disableScanner && !forceScan && (
        <div className="flex w-full bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${mode === 'add' ? 'bg-white dark:bg-blue-600 shadow-md text-blue-700 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            onClick={() => { setMode('add'); setErrorMsg('') }}
          >
            Add Stock
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${mode === 'sell' ? 'bg-white dark:bg-emerald-600 shadow-md text-emerald-700 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            onClick={() => { setMode('sell'); setErrorMsg('') }}
          >
            Sell Stock
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs p-4 rounded-2xl text-center font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          <X className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* STEP: IDLE — Show scan button */}
      {step === 'idle' && (
        <button
          onClick={startScanner}
          className={`group relative w-full text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-4 text-lg overflow-hidden ${mode === 'add' ? 'bg-linear-to-r from-blue-600 to-indigo-700' : 'bg-linear-to-r from-emerald-600 to-teal-700'}`}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
          {mode === 'add' ? 'Scan Product to Add' : 'Scan Product to Sell'}
        </button>
      )}

      {/* STEP: SCANNING — Camera view */}
      {step === 'scanning' && (
        <div className="relative w-full">
          <div className="mb-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider animate-pulse-soft flex items-center justify-center gap-2">
              <ScanLine className="w-4 h-4" /> Point camera at a barcode
            </p>
          </div>
          <div
            id={scannerContainerId.current}
            className="w-full rounded-3xl overflow-hidden border-2 border-blue-500/30 dark:border-blue-500/20 shadow-2xl"
          />
          <button
            onClick={stopScanning}
            className="mt-4 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-2xl text-xs font-black transition-all border border-slate-200 dark:border-slate-700"
          >
            Cancel Scan
          </button>
        </div>
      )}

      {/* STEP: LOADING — Lookup in progress */}
      {step === 'loading' && (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 w-full animate-in fade-in">
          <div className="relative mb-6">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white">Looking up product...</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest font-black">Powered by AI Analytics</p>
        </div>
      )}

      {/* STEP: FORM — Product detected, fill remaining info */}
      {step === 'form' && (
        <div className="bg-white dark:bg-slate-900/50 border w-full border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl shadow-slate-200/50 dark:shadow-black/20 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          {/* Scanned product info card */}
          {scannedProduct && scannedProduct.productName && (
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 rounded-2xl p-4 flex items-center gap-4">
              {scannedProduct.imageUrl ? (
                <img src={scannedProduct.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-blue-100 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shadow-sm">
                  <Package className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white truncate text-sm">{scannedProduct.productName}</p>
                {scannedProduct.brand && <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">{scannedProduct.brand}</p>}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono tracking-tighter uppercase">ID: {scannedProduct.barcode}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
              <input
                className={`mt-1.5 w-full rounded-2xl shadow-sm px-4 py-3 border text-sm font-bold transition-all ${scannedProduct?.productName ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                readOnly={!!scannedProduct?.productName}
                placeholder="Product name"
              />
            </div>

            {mode === 'add' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Quantity *</label>
                    <input
                      type="number"
                      className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                      min="1"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Expiry Date *</label>
                    <input
                      type="date"
                      className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      value={form.expiryDate}
                      onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Distributor</label>
                    <input
                      className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      value={form.distributorName}
                      onChange={(e) => setForm((f) => ({ ...f, distributorName: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Price/unit (₹)</label>
                    <input
                      type="number"
                      className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      value={form.purchasePrice}
                      onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Batch No</label>
                  <input
                    className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    value={form.batchNumber}
                    onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Quantity to Sell</label>
                <input
                  type="number"
                  className="mt-1.5 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  min="1"
                  placeholder="1"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold px-1">FIFO logic: System automatically selects earliest-expiry items first.</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            {!disableScanner && (
              <button
                onClick={resetForm}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3.5 rounded-2xl font-black transition-all text-xs border border-slate-200 dark:border-slate-700"
              >
                Re-scan
              </button>
            )}
            <button
              disabled={loading || !productName.trim()}
              onClick={handleSubmit}
              className={`flex-[2] text-white py-3.5 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] ${mode === 'add' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'add' ? (
                'Add Batch +'
              ) : (
                'Confirm Sale'
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP: SUCCESS */}
      {step === 'success' && (
        <div className="py-20 flex flex-col items-center justify-center w-full animate-in zoom-in-95">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="absolute inset-0 blur-2xl bg-emerald-500/20" />
          </div>
          <p className="font-black text-slate-900 dark:text-white text-xl">
            {mode === 'add' ? 'Stock Added!' : 'Sale Recorded!'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-widest">Updating Dashboard...</p>
        </div>
      )}
    </div>
  )
}
