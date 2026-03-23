import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from './supabase'

const SESSION_COOKIE = 'stockguard_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

// ─── Password Utilities ───────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── OTP Utilities ────────────────────────────────────

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getOTPExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
}

// ─── Session Utilities ────────────────────────────────

interface SessionPayload {
  shopkeeperId: string
  shopId: string
  shopName: string
  email: string
}

/** Create a session cookie after successful OTP verification */
export async function createSession(payload: SessionPayload): Promise<void> {
  // Store session data as a simple JSON token in a cookie
  // In production, you'd use JWT or a proper session store
  const sessionData = Buffer.from(JSON.stringify({
    ...payload,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  })).toString('base64')

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/** Read and validate the current session */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(SESSION_COOKIE)
    if (!cookie?.value) return null

    const data = JSON.parse(Buffer.from(cookie.value, 'base64').toString())
    if (data.expiresAt < Date.now()) return null

    return {
      shopkeeperId: data.shopkeeperId,
      shopId: data.shopId,
      shopName: data.shopName,
      email: data.email,
    }
  } catch {
    return null
  }
}

/** Destroy the session (logout) */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Verify that a shopkeeper exists and return their data */
export async function verifyCredentials(email: string, password: string) {
  const { data: shopkeeper } = await supabase
    .from('Shopkeeper')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!shopkeeper) return null

  const valid = await verifyPassword(password, shopkeeper.passwordHash)
  if (!valid) return null

  return shopkeeper
}

/** Resolve shop ID from the authenticated user (checks session, Supabase Auth metadata, Shopkeeper table) */
export async function resolveShopIdFromAuth(): Promise<string | null> {
  const { shopId } = await resolveAuthContext()
  return shopId
}

/** Resolve both userId and shopId from the authenticated user */
export async function resolveAuthContext(): Promise<{ userId: string | null; shopId: string | null }> {
  // First try legacy session cookie
  const session = await getSession()
  
  const cookieStore = await cookies()

  // Import dynamically to avoid circular deps
  const { createServerClient } = await import('@supabase/ssr')
  
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )

  const { data: authData } = await supabaseServer.auth.getUser()
  const user = authData.user
  if (!user) {
    // Fall back to legacy session
    if (session?.shopId) return { userId: null, shopId: session.shopId }
    return { userId: null, shopId: null }
  }

  const userId = user.id
  const email = user.email?.toLowerCase().trim()
  const meta = (user.user_metadata || {}) as {
    shop_id?: string
    shop_name?: string
    shopName?: string
  }

  if (session?.shopId) return { userId, shopId: session.shopId }
  if (meta.shop_id) return { userId, shopId: meta.shop_id }

  const metaShopName = meta.shop_name || meta.shopName
  if (metaShopName && typeof metaShopName === 'string') {
    const { data: shopByName } = await supabaseServer
      .from('Shop')
      .select('id')
      .eq('name', metaShopName.trim())
      .maybeSingle()
    if (shopByName?.id) return { userId, shopId: shopByName.id }
  }

  if (email) {
    const { data: shopkeeper } = await supabaseServer
      .from('Shopkeeper')
      .select('shopId')
      .eq('email', email)
      .maybeSingle()
    if (shopkeeper?.shopId) return { userId, shopId: shopkeeper.shopId }
  }

  return { userId, shopId: null }
}
