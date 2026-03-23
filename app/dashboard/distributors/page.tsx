import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-auth'
import { redirect } from 'next/navigation'
import DistributorsList from '@/components/distributors/DistributorsList'

export const dynamic = 'force-dynamic'

export default async function DistributorsPage() {
  const { userId, shopId } = await getAuthenticatedUser()
  if (!userId) redirect('/login')

  const supabase = await createAuthenticatedSupabaseClient()

  // Get all distributors for this shop with their return logs
  const { data: distributors } = await supabase
    .from('Distributor')
    .select('*, returnLogs:ReturnLog(*)')
    .eq('shopId', shopId || '')

  // Get products supplied by each distributor via batches
  const { data: batches } = await supabase
    .from('Batch')
    .select('productId, distributorId, quantity, expiryDate, product:Product(name)')
    .not('distributorId', 'is', null)

  const distData = (distributors || []).map((d: any) => {
    const totalReturns = d.returnLogs?.length || 0
    const accepted = d.returnLogs?.filter((r: any) => r.outcome === 'accepted').length || 0
    const rejected = d.returnLogs?.filter((r: any) => r.outcome === 'rejected').length || 0
    const pending = d.returnLogs?.filter((r: any) => r.outcome === 'pending').length || 0

    // Find products supplied by this distributor
    const distBatches = (batches || []).filter((b: any) => b.distributorId === d.id)
    const productNames = [...new Set(distBatches.map((b: any) => b.product?.name).filter(Boolean))]
    const totalSupplied = distBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)

    return {
      id: d.id,
      name: d.name,
      totalReturns,
      accepted,
      rejected,
      pending,
      reliabilityScore: totalReturns > 0 ? accepted / totalReturns : 1.0,
      hasEscalation: rejected >= 2,
      productsSupplied: productNames as string[],
      totalSupplied,
    }
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto flex-1">
      <DistributorsList distributors={distData} shopId={shopId || ''} />
    </div>
  )
}
