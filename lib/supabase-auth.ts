import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase server client that respects the authenticated user's session.
 * This ensures RLS policies filter data per-user.
 * Use this for ALL server-side data fetching (not the plain supabase client).
 */
export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component context — safe to ignore
          }
        },
      },
    }
  )
}

/**
 * Gets the current user's ID and shop ID from Supabase Auth.
 * Returns { userId, shopId } or nulls if not authenticated.
 */
export async function getAuthenticatedUser() {
  const supabase = await createAuthenticatedSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { userId: null, shopId: null, user: null }
  
  const userId = user.id
  const meta = (user.user_metadata || {}) as {
    shop_id?: string
    shop_name?: string
    shopName?: string
  }

  // Try metadata first
  if (meta.shop_id) return { userId, shopId: meta.shop_id, user }

  // Try to find Shop by user_id (most reliable after RLS migration)
  const { data: shopByUserId } = await supabase
    .from('Shop')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (shopByUserId?.id) return { userId, shopId: shopByUserId.id, user }

  // Fallback: find by shop_name in metadata
  const metaShopName = meta.shop_name || meta.shopName
  if (metaShopName) {
    const { data: shopByName } = await supabase
      .from('Shop')
      .select('id')
      .eq('name', metaShopName)
      .maybeSingle()
    if (shopByName?.id) return { userId, shopId: shopByName.id, user }
  }

  // Fallback: Shopkeeper table
  const email = user.email?.toLowerCase().trim()
  if (email) {
    const { data: shopkeeper } = await supabase
      .from('Shopkeeper')
      .select('shopId')
      .eq('email', email)
      .maybeSingle()
    if (shopkeeper?.shopId) return { userId, shopId: shopkeeper.shopId, user }
  }

  return { userId, shopId: null, user }
}
