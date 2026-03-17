interface Props {
  data: { atRisk: number; recovered: number; lost: number; atRiskCount: number }
}

export default function LossCalculator({ data }: Props) {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 stagger-children">
      {/* At Risk */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/60 rounded-2xl p-5 group hover:shadow-md hover:shadow-red-100/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/20 rounded-full -translate-y-6 translate-x-6" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider">At Risk / जोखिम में</p>
          </div>
          <p className="text-3xl font-extrabold text-red-700 mt-2 tracking-tight">{fmt(data.atRisk)}</p>
          <p className="text-xs text-red-400 mt-1.5 font-medium">{data.atRiskCount} batches expiring ≤30 days</p>
        </div>
      </div>

      {/* Recovered */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60 rounded-2xl p-5 group hover:shadow-md hover:shadow-emerald-100/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full -translate-y-6 translate-x-6" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">✅</span>
            <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">Recovered / वसूला</p>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2 tracking-tight">{fmt(data.recovered)}</p>
          <p className="text-xs text-emerald-400 mt-1.5 font-medium">This month / इस महीने</p>
        </div>
      </div>

      {/* Lost */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/60 rounded-2xl p-5 group hover:shadow-md hover:shadow-gray-100/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gray-200/20 rounded-full -translate-y-6 translate-x-6" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">📉</span>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Lost / नुकसान</p>
          </div>
          <p className="text-3xl font-extrabold text-gray-700 mt-2 tracking-tight">{fmt(data.lost)}</p>
          <p className="text-xs text-gray-400 mt-1.5 font-medium">To date / आज तक</p>
        </div>
      </div>
    </div>
  )
}
