import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: shops } = await supabase.from("Shop").select("*");
  const { data: profiles } = await supabase.from("profiles").select("*").limit(1);

  return NextResponse.json({
    user: user?.id || 'none',
    userMetadata: user?.user_metadata || {},
    shopsFound: shops?.length || 0,
    shops: shops || [],
    profilesTableExists: !!profiles,
    envShopId: process.env.NEXT_PUBLIC_SHOP_ID
  });
}
