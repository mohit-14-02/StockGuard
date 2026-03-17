import { NextResponse } from 'next/server'
import { generateAndSendDailySummary } from '@/lib/summaryService'

// POST /api/demo/send-summary — Main trigger (from dashboard button)
export async function POST(request: Request) {
  try {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID || '11111111-1111-1111-1111-111111111111'

    // Allow optional phone override for testing
    const body = await request.json().catch(() => ({}))
    const phoneOverride = body.phone || process.env.OWNER_PHONE

    console.log(`[Demo] Triggering daily summary for shop ${shopId}...`)

    const result = await generateAndSendDailySummary(shopId, phoneOverride)

    return NextResponse.json({
      success: true,
      message: ' Daily summary sent! Check your WhatsApp.',
      sentTo: result.phone,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Demo] Summary send failed:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        hint: 'Make sure OWNER_PHONE is set in .env.local with format whatsapp:+91XXXXXXXXXX',
      },
      { status: 500 }
    )
  }
}

// GET /api/demo/send-summary — Quick trigger from browser URL bar
export async function GET() {
  try {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID || '11111111-1111-1111-1111-111111111111'
    const phone = process.env.OWNER_PHONE

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'OWNER_PHONE not set in .env.local' },
        { status: 400 }
      )
    }

    console.log(`[Demo GET] Triggering daily summary...`)
    const result = await generateAndSendDailySummary(shopId, phone)

    return NextResponse.json({
      success: true,
      message: 'Summary sent via GET trigger!',
      sentTo: result.phone,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
