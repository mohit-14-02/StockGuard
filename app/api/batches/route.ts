import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { shouldBlockReorder } from "@/lib/reorderCheck";

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

async function resolveShopId(supabase: any, user: any) {
  if (!user) return null;
  const meta = (user.user_metadata || {}) as { shop_id?: string; shop_name?: string; shopName?: string };

  if (meta.shop_id) return meta.shop_id;

  // Find by user_id (most reliable after RLS migration)
  const { data: shopByUserId } = await supabase
    .from("Shop")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (shopByUserId?.id) return shopByUserId.id;

  const metaShopName = meta.shop_name || meta.shopName;
  if (metaShopName) {
    const { data: shopByName } = await supabase
      .from("Shop")
      .select("id")
      .eq("name", metaShopName)
      .maybeSingle();
    if (shopByName?.id) return shopByName.id;
  }

  // Final fallback: Get the first shop associated with this user
  const { data: firstShop } = await supabase
    .from("Shop")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  
  if (firstShop?.id) return firstShop.id;

  // Final, emergency fallback for hackathon mode
  if (process.env.NEXT_PUBLIC_SHOP_ID) return process.env.NEXT_PUBLIC_SHOP_ID;

  // ABSOLUTE FINAL FALLBACK: Get ANY shop in the system
  const { data: anyShop } = await supabase
    .from("Shop")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (anyShop?.id) return anyShop.id;

  return null;
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient();
  const shopId = await resolveShopId(supabase, user) || req.nextUrl.searchParams.get("shopId");
  
  if (!shopId)
    return NextResponse.json({ error: "Unauthorized: shop context not found" }, { status: 401 });

  const { data: products } = await supabase
    .from("Product")
    .select("id")
    .eq("shopId", shopId);

  const productIds = (products || []).map((p: any) => p.id);
  if (productIds.length === 0) return NextResponse.json([]);

  const { data: batches } = await supabase
    .from("Batch")
    .select("*, product:Product(*), distributor:Distributor(*)")
    .in("productId", productIds)
    .order("expiryDate", { ascending: true });

  const today = new Date();
  const result = (batches || []).map((b: any) => ({
    ...b,
    daysUntilExpiry: Math.ceil(
      (new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));

  return NextResponse.json(result);
}

const BatchSchema = z.object({
  shopId: z.string().optional().transform(v => (v && v.length > 0 ? v : undefined)),
  productName: z.string().min(1),
  batchNumber: z.string().optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().positive(),
  purchasePrice: z.number().nonnegative().optional(),
  distributorName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BatchSchema.parse(await req.json());
    const { supabase, user } = await getAuthenticatedClient();
    const userId = user?.id || null;
    const resolvedShopId = await resolveShopId(supabase, user) || body.shopId;

    console.log('[POST /api/batches] Debug context:', {
      userId,
      resolvedShopId,
      bodyShopId: body.shopId,
      envShopId: process.env.NEXT_PUBLIC_SHOP_ID
    });

    if (!resolvedShopId) {
      return NextResponse.json({ error: "Unauthorized: shop context not found" }, { status: 401 });
    }

    // Upsert product - try with user_id first, fallback if column missing
    let { data: products } = await supabase
      .from("Product")
      .select("*")
      .eq("shopId", resolvedShopId)
      .eq("name", body.productName);

    let product = products?.[0];
    if (!product) {
      const { data: newProd, error: prodErr } = await supabase
        .from("Product")
        .insert({ shopId: resolvedShopId, name: body.productName, user_id: userId })
        .select()
        .single();
      
      if (prodErr && prodErr.code === '42703') { // Column missing
        const { data: fallbackProd } = await supabase
          .from("Product")
          .insert({ shopId: resolvedShopId, name: body.productName })
          .select()
          .single();
        product = fallbackProd;
      } else {
        product = newProd;
      }
    }

    if (!product) throw new Error("Could not create/resolve product");

    // Upsert distributor
    let distributorId: string | undefined;
    if (body.distributorName) {
      let { data: dists } = await supabase
        .from("Distributor")
        .select("*")
        .eq("shopId", resolvedShopId)
        .eq("name", body.distributorName);

      let dist = dists?.[0];
      if (!dist) {
        const { data: newDist, error: distErr } = await supabase
          .from("Distributor")
          .insert({ shopId: resolvedShopId, name: body.distributorName, user_id: userId })
          .select()
          .single();
        
        if (distErr && distErr.code === '42703') {
          const { data: fallbackDist } = await supabase
            .from("Distributor")
            .insert({ shopId: resolvedShopId, name: body.distributorName })
            .select()
            .single();
          dist = fallbackDist;
        } else {
          dist = newDist;
        }
      }
      distributorId = dist?.id;
    }

    // Create batch
    const { data: batch, error: batchErr } = await supabase
      .from("Batch")
      .insert({
        productId: product.id,
        distributorId: distributorId ?? null,
        batchNumber: body.batchNumber ?? null,
        expiryDate: new Date(body.expiryDate).toISOString(),
        quantity: body.quantity,
        purchasePrice: body.purchasePrice ?? null,
        user_id: userId,
      })
      .select()
      .single();

    let finalBatch = batch;
    if (batchErr && batchErr.code === '42703') {
      const { data: fallbackBatch } = await supabase
        .from("Batch")
        .insert({
          productId: product.id,
          distributorId: distributorId ?? null,
          batchNumber: body.batchNumber ?? null,
          expiryDate: new Date(body.expiryDate).toISOString(),
          quantity: body.quantity,
          purchasePrice: body.purchasePrice ?? null,
        })
        .select()
        .single();
      finalBatch = fallbackBatch;
    } else if (batchErr) {
      throw batchErr;
    }

    // Reorder check
    const { data: existingBatches } = await supabase
      .from("Batch")
      .select("*")
      .eq("productId", product.id);

    const reorderWarning = shouldBlockReorder(
      (existingBatches || []).map((b: any) => ({
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice,
      })),
    );

    return NextResponse.json({
      batch: finalBatch,
      reorderWarning: reorderWarning.block ? reorderWarning : null,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
