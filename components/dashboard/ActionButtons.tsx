'use client'
import { useState } from 'react'
import BarcodeScanner from '@/components/entry/BarcodeScanner'
import { PlusCircle, MinusCircle, ScanLine, FileText, X } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

interface ActionButtonsProps {
  shopId: string
}

export default function ActionButtons({ shopId }: ActionButtonsProps) {
  const { t } = useLanguage()
  const [activeModal, setActiveModal] = useState<'add' | 'sell' | 'scan' | null>(null)

  const closeModal = () => setActiveModal(null)

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6 stagger-children">
        <button
          onClick={() => setActiveModal('scan')}
          className="group flex flex-col items-center justify-center gap-3 bg-linear-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-5 rounded-3xl transition-all shadow-xl shadow-orange-500/20 active:scale-[0.97] hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all shadow-inner">
            <ScanLine className="w-7 h-7" />
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">{t.scanBarcode}</span>
        </button>
        <button
          onClick={() => setActiveModal('add')}
          className="group flex flex-col items-center justify-center gap-3 bg-linear-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-5 rounded-3xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.97] hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all shadow-inner">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">{t.upload}</span>
        </button>
        <button
          onClick={() => setActiveModal('sell')}
          className="group flex flex-col items-center justify-center gap-3 bg-linear-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white p-5 rounded-3xl transition-all shadow-xl shadow-violet-500/20 active:scale-[0.97] hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all shadow-inner">
            <MinusCircle className="w-7 h-7" />
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">{t.sales}</span>
        </button>
      </div>

      {/* Modal: Scan Product */}
      {activeModal === 'scan' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <button onClick={closeModal} className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-inner">
                <ScanLine className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{t.scanBarcode}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2 px-0.5">Inventory Management</p>
              </div>
            </div>
            <BarcodeScanner shopId={shopId} defaultMode="add" onSuccess={closeModal} />
          </div>
        </div>
      )}

      {/* Modal: Add Manual Stock */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <button onClick={closeModal} className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner">
                <PlusCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Add New Stock</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2 px-0.5">Manual Entry System</p>
              </div>
            </div>
            <BarcodeScanner shopId={shopId} defaultMode="add" disableScanner={true} onSuccess={closeModal} />
          </div>
        </div>
      )}

      {/* Modal: Sell / Remove Stock */}
      {activeModal === 'sell' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <button onClick={closeModal} className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shadow-inner">
                <MinusCircle className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{t.sales}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2 px-0.5">Recording Transactions</p>
              </div>
            </div>
            <BarcodeScanner shopId={shopId} defaultMode="sell" onSuccess={closeModal} />
          </div>
        </div>
      )}
    </>
  )
}
