import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-auth'
import { redirect } from 'next/navigation'
import ProductsList from '@/components/products/ProductsList'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const { userId, shopId } = await getAuthenticatedUser()
  if (!userId) redirect('/login')

  const supabase = await createAuthenticatedSupabaseClient()

  // Get all products for this shop
  const { data: products } = await supabase
    .from('Product')
    .select('id, name')
    .eq('shopId', shopId || '')

  const productIds = (products || []).map((p: any) => p.id)

  // Get all batches for these products
  const { data: batches } = productIds.length > 0
    ? await supabase
      .from('Batch')
      .select('*, distributor:Distributor(id, name)')
      .in('productId', productIds)
      .order('expiryDate', { ascending: true })
    : { data: [] }

  // Get all distributors for this shop
  const { data: distributors } = await supabase
    .from('Distributor')
    .select('id, name')
    .eq('shopId', shopId || '')

  // Get recent sales (last 7 days) per product
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: recentSales } = await supabase
    .from('Sales')
    .select('productId, quantity, createdAt')
    .eq('shopId', shopId || '')
    .gte('createdAt', sevenDaysAgo.toISOString())

  // Build product data with stock info
  const today = new Date()
  const productData = (products || []).map((p: any) => {
    const productBatches = (batches || []).filter((b: any) => b.productId === p.id)
    const totalStock = productBatches.reduce((sum: number, b: any) => sum + b.quantity, 0)
    const expiredBatches = productBatches.filter((b: any) => new Date(b.expiryDate) <= today)
    const criticalBatches = productBatches.filter((b: any) => {
      const days = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000)
      return days > 0 && days <= 15
    })
    const safeBatches = productBatches.filter((b: any) => {
      const days = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000)
      return days > 15
    })
    
    // Get last distributor
    const lastDistributor = productBatches
      .filter((b: any) => b.distributor)
      .sort((a: any, b: any) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0]
      ?.distributor

    // Weekly sales
    const weeklySales = (recentSales || [])
      .filter((s: any) => s.productId === p.id)
      .reduce((sum: number, s: any) => sum + s.quantity, 0)

    return {
      id: p.id,
      name: p.name,
      totalStock,
      expiredCount: expiredBatches.length,
      criticalCount: criticalBatches.length,
      safeCount: safeBatches.length,
      batchCount: productBatches.length,
      lastDistributor: lastDistributor?.name || null,
      lastDistributorId: lastDistributor?.id || null,
      weeklySales,
      isLowStock: totalStock > 0 && totalStock <= 10,
      isOutOfStock: totalStock === 0,
    }
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto flex-1">
      <ProductsList 
        products={productData} 
        distributors={(distributors || []).map((d: any) => ({ id: d.id, name: d.name }))}
        shopId={shopId || ''} 
      />
    </div>
  )
}
