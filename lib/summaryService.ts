import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateAndSendDailySummary(shopId: string, phoneOverride?: string) {
  try {
    // 1. Date ranges
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const next7Days = new Date(todayStart)
    next7Days.setDate(next7Days.getDate() + 7)

    // 2. Fetch Shop Details
    const { data: shop } = await supabase
      .from('Shop')
      .select('*')
      .eq('id', shopId)
      .single()

    if (!shop) throw new Error('Shop not found')

    const targetPhone = phoneOverride || shop.whatsappNum || process.env.OWNER_PHONE
    if (!targetPhone) throw new Error('No target phone number found')

    // 3. Fetch Data

    // Items expiring today or already expired with stock
    const { data: expiringToday } = await supabase
      .from('Batch')
      .select('*, product:Product(name)')
      .lte('expiryDate', todayEnd.toISOString())
      .gt('quantity', 0)

    // Items expiring in next 7 days (upcoming)
    const { data: expiringSoon } = await supabase
      .from('Batch')
      .select('*, product:Product(name)')
      .gt('expiryDate', todayEnd.toISOString())
      .lte('expiryDate', next7Days.toISOString())
      .gt('quantity', 0)

    // Low Stock Items (qty <= 10 but > 0)
    const { data: batches } = await supabase
      .from('Batch')
      .select('productId, quantity, product:Product(name)')

    const stockMap: Record<string, { name: string; stock: number }> = {}
    batches?.forEach((b: any) => {
      if (!stockMap[b.productId]) {
        stockMap[b.productId] = { name: b.product?.name || 'Unknown', stock: 0 }
      }
      stockMap[b.productId].stock += b.quantity
    })

    const lowStockItems = Object.values(stockMap).filter(
      (item) => item.stock > 0 && item.stock <= 10
    )

    // Pending returns (return logs with outcome='pending')
    const { data: pendingReturns } = await supabase
      .from('ReturnLog')
      .select('*, batch:Batch(*, product:Product(name)), distributor:Distributor(name)')
      .eq('outcome', 'pending')

    // Calculate total ₹ at risk
    const atRiskValue = Math.round(
      (expiringToday || []).concat(expiringSoon || []).reduce(
        (sum: number, b: any) => sum + b.quantity * (b.purchasePrice ?? 0),
        0
      )
    )

    // 4. Build Message
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

    let message = `${greeting}! ☀️\n\n`
    message += `📊 *Daily Summary — ${shop.name}*\n`
    message += `📅 ${todayStart.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`

    // ── At Risk Summary ──
    if (atRiskValue > 0) {
      message += `💰 *₹${atRiskValue.toLocaleString('en-IN')} at risk this week*\n\n`
    }

    // ── Expiring Today ──
    message += `🚨 *Expiring Today:*\n`
    if (expiringToday && expiringToday.length > 0) {
      expiringToday.slice(0, 5).forEach((e: any) => {
        const value = e.purchasePrice ? ` — ₹${Math.round(e.quantity * e.purchasePrice)}` : ''
        message += `• ${e.product?.name || 'Item'} (${e.quantity} units${value})\n`
      })
      if (expiringToday.length > 5) {
        message += `• ...and ${expiringToday.length - 5} more items\n`
      }
    } else {
      message += `• No items expiring today ✅\n`
    }

    // ── Expiring This Week ──
    message += `\n⚠️ *Expiring This Week:*\n`
    if (expiringSoon && expiringSoon.length > 0) {
      expiringSoon.slice(0, 5).forEach((e: any) => {
        const expDate = new Date(e.expiryDate)
        const daysLeft = Math.ceil((expDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
        message += `• ${e.product?.name || 'Item'} — ${daysLeft}d left (${e.quantity} units)\n`
      })
      if (expiringSoon.length > 5) {
        message += `• ...and ${expiringSoon.length - 5} more items\n`
      }
    } else {
      message += `• No upcoming expiries. All clear! 👍\n`
    }

    // ── Pending Returns ──
    if (pendingReturns && pendingReturns.length > 0) {
      message += `\n🔄 *Pending Returns:*\n`
      pendingReturns.slice(0, 3).forEach((r: any) => {
        message += `• ${r.batch?.product?.name || 'Item'} → ${r.distributor?.name || 'Distributor'}\n`
      })
      if (pendingReturns.length > 3) {
        message += `• ...and ${pendingReturns.length - 3} more\n`
      }
    }

    // ── Low Stock ──
    if (lowStockItems.length > 0) {
      message += `\n📦 *Low Stock Alert:*\n`
      lowStockItems.slice(0, 3).forEach((item) => {
        message += `• ${item.name} — only ${item.stock} left\n`
      })
      if (lowStockItems.length > 3) {
        message += `• ...and ${lowStockItems.length - 3} more\n`
      }
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n`
    message += `Keep up the great work! 🚀\n`
    message += `— ExpiryGuard AI`

    // 5. Send Message
    await sendWhatsAppMessage(targetPhone, message)

    console.log(`✅ Daily summary sent successfully to ${targetPhone}`)
    return { success: true, message: 'Summary sent', phone: targetPhone }
  } catch (error: any) {
    console.error('❌ WhatsApp sending failed:', error.message || error)
    throw error
  }
}
