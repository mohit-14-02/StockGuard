import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuthenticatedClient() {
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
  return { supabase, user };
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find shop by user_id
  const { data: shop } = await supabase
    .from("Shop")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  
  const shopId = shop?.id || req.nextUrl.searchParams.get("shopId");
  if (!shopId)
    return NextResponse.json({ error: "shopId required" }, { status: 400 });

  const { data: distributors, error } = await supabase
    .from("Distributor")
    .select("*, returnLogs:ReturnLog(*)")
    .eq("shopId", shopId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (distributors || []).map((d: any) => {
    const totalReturns = d.returnLogs?.length || 0;
    const accepted = d.returnLogs?.filter((r: any) => r.outcome === "accepted").length || 0;
    const rejected = d.returnLogs?.filter((r: any) => r.outcome === "rejected").length || 0;
    
    return {
      id: d.id,
      name: d.name,
      totalReturns,
      accepted,
      reliabilityScore: totalReturns > 0 ? accepted / totalReturns : 1.0,
      hasEscalation: rejected >= 2,
    };
  });

  return NextResponse.json(result);
}
