import { supabase } from '@/lib/supabase'
import { calcAtRisk, calcRecovered, calcLost } from '@/lib/lossCalculator'
import LossCalculator from '@/components/dashboard/LossCalculator'
import BatchTable from '@/components/dashboard/BatchTable'
import DistributorScore from '@/components/dashboard/DistributorScore'
import InvoiceUpload from '@/components/entry/InvoiceUpload'
import ActionButtons from '@/components/dashboard/ActionButtons'
import DashboardWidgets from '@/components/dashboard/DashboardWidgets'
import RestockAlerts from '@/components/dashboard/RestockAlerts'
import ExpiryChecker from '@/components/dashboard/ExpiryChecker'
import SendSummaryButton from '@/components/dashboard/SendSummaryButton'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID || ''

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { data: products } = await supabase
    .from('Product')
    .select('id, name')
    .eq('shopId', SHOP_ID)

  const productIds = (products || []).map((p: any) => p.id)

  const batchesPromise = productIds.length > 0
    ? supabase
        .from('Batch')
        .select('*, product:Product(*), distributor:Distributor(*)')
        .in('productId', productIds)
        .order('expiryDate', { ascending: true })
    : Promise.resolve({ data: [], error: null })

  const distributorsPromise = supabase
    .from('Distributor')
    .select('*, returnLogs:ReturnLog(*)')
    .eq('shopId', SHOP_ID)

  const salesPromise = supabase
    .from('Sales')
    .select('*')
    .eq('shopId', SHOP_ID)

  const [batchesRes, distributorsRes, salesRes] = await Promise.all([
    batchesPromise,
    distributorsPromise,
    salesPromise,
  ])

  const batches = batchesRes.data || []
  const distributors = distributorsRes.data || []
  const sales = salesRes.data || []

  const batchIds = batches.map((b: any) => b.id)
  const returnLogsRes = batchIds.length > 0
    ? await supabase
        .from('ReturnLog')
        .select('*, batch:Batch(*)')
        .in('batchId', batchIds)
    : { data: [] }

  const returnLogs = returnLogsRes.data || []

  const acceptedIds = new Set(returnLogs.filter((r: any) => r.outcome === 'accepted').map((r: any) => r.batchId) as string[])
  const today = new Date()

  let itemsSoldToday = 0
  let lowStockCount = 0
  let restockAlerts = 0
  let currentInventoryCount = 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const stockMap: Record<string, number> = {}
  const productNameMap: Record<string, string> = {}
  batches.forEach((b: any) => {
    stockMap[b.productId] = (stockMap[b.productId] || 0) + b.quantity
    currentInventoryCount += b.quantity
    if (b.product?.name) productNameMap[b.productId] = b.product.name
  })

  const salesMap7d: Record<string, number> = {}
  sales.forEach((s: any) => {
    const saleDate = new Date(s.createdAt)
    if (saleDate >= todayStart) {
      itemsSoldToday += s.quantity
    }
    if (saleDate >= sevenDaysAgo) {
      salesMap7d[s.productId] = (salesMap7d[s.productId] || 0) + s.quantity
    }
  })

  const restockProducts: { name: string; stock: number; limit: number }[] = []
  const RESTOCK_LIMIT_THRESHOLD = 10

  productIds.forEach((pid: string) => {
    const stock = stockMap[pid] || 0
    if (stock > 0 && stock <= 5) lowStockCount++

    if (stock > 0 && stock <= RESTOCK_LIMIT_THRESHOLD) {
      restockAlerts++
      restockProducts.push({
        name: productNameMap[pid] || pid,
        stock,
        limit: RESTOCK_LIMIT_THRESHOLD,
      })
    }
  })

  const lossData = {
    atRisk: Math.round(calcAtRisk(batches)),
    recovered: Math.round(calcRecovered(returnLogs)),
    lost: Math.round(calcLost(batches, acceptedIds)),
    atRiskCount: batches.filter((b: any) => {
      const d = (new Date(b.expiryDate).getTime() - today.getTime()) / 86400000
      return d > 0 && d <= 30
    }).length,
  }

  const batchesWithDays = batches.map((b: any) => ({
    ...b,
    daysUntilExpiry: Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000)
  }))

  const distData = (distributors || []).map((d: any) => ({
    id: d.id, name: d.name,
    total: d.returnLogs.length,
    accepted: d.returnLogs.filter((r: any) => r.outcome === 'accepted').length,
    rejected: d.returnLogs.filter((r: any) => r.outcome === 'rejected').length,
    hasEscalation: d.returnLogs.filter((r: any) => r.outcome === 'rejected').length >= 2
  }))

  // Get greeting based on time
  const hour = new Date().getHours()
  let greeting = 'Good Morning'
  let greetingHi = 'सुप्रभात'
  if (hour >= 12 && hour < 17) { greeting = 'Good Afternoon'; greetingHi = 'नमस्कार' }
  else if (hour >= 17) { greeting = 'Good Evening'; greetingHi = 'शुभ संध्या' }

  return (
    <main className="p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto flex-1">
      <ExpiryChecker />
      
      {/* Header with greeting */}
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="ml-12 md:ml-0">
            <p className="text-sm text-gray-400 font-medium">{greeting} / {greetingHi} 👋</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              StockGuard Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </header>

      {/* Loss Calculator - MUKHYA / मुख्य */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">💰 Loss Calculator / नुकसान कैलकुलेटर</p>
        <LossCalculator data={lossData} />
      </section>

      {/* Quick Actions */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">⚡ Quick Actions / त्वरित क्रियाएं</p>
        <ActionButtons shopId={SHOP_ID} />
      </section>

      {/* WhatsApp Summary */}
      <div className="mb-6">
        <SendSummaryButton />
      </div>

      {/* Dashboard Stats */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">📊 Overview / अवलोकन</p>
        <DashboardWidgets
          itemsSoldToday={itemsSoldToday}
          lowStockCount={lowStockCount}
          restockAlerts={restockAlerts}
          currentInventoryCount={currentInventoryCount}
        />
      </section>

      {/* Restock Alerts */}
      {restockProducts.length > 0 && (
        <RestockAlerts products={restockProducts} />
      )}

      {/* Invoice Upload */}
      <section className="mb-6">
        <InvoiceUpload shopId={SHOP_ID} />
      </section>

      {/* Batch Table */}
      <section className="mb-6">
        <BatchTable batches={batchesWithDays} shopId={SHOP_ID} />
      </section>

      {/* Distributors */}
      <section className="mb-6">
        <DistributorScore distributors={distData} />
      </section>
    </main>
  )
}
