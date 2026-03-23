import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  return { supabase, userId: user?.id || null };
}

const RemoveProductSchema = z.object({
  shopId: z.string(),
  productId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  productName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = RemoveProductSchema.parse(await req.json());
    const { supabase, userId } = await getAuthenticatedClient();

    // Resolve productId if not provided
    let productId = body.productId;
    if (!productId) {
      const { data: productData, error: prodErr } = await supabase
        .from("Product")
        .select("id")
        .eq("shopId", body.shopId)
        .eq("name", body.productName)
        .single();
      
      if (prodErr || !productData) {
        return NextResponse.json({ error: "Product not found in this shop" }, { status: 404 });
      }
      productId = productData.id;
    }

    let remainingToRemove = body.quantity;
    const removedBatches: { id: string; removeAmt: number; purchasePrice: number | null; expiryDate: string }[] = [];

    if (body.batchId) {
      // ── Remove from specific batch ──
      const { data: batch, error: batchErr } = await supabase
        .from("Batch")
        .select("*")
        .eq("id", body.batchId)
        .single();
        
      if (batchErr || !batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      if (batch.quantity <= 0) {
        return NextResponse.json({ error: "Batch is already empty" }, { status: 400 });
      }

      const removeAmt = Math.min(batch.quantity, remainingToRemove);
      removedBatches.push({ id: batch.id, removeAmt, purchasePrice: batch.purchasePrice, expiryDate: batch.expiryDate });
      remainingToRemove -= removeAmt;

    } else {
      // ── FIFO Logic: reduce from earliest-expiry batch first ──
      const { data: batches, error: batchesErr } = await supabase
        .from("Batch")
        .select("*")
        .eq("productId", productId)
        .gt("quantity", 0)
        .order("expiryDate", { ascending: true });

      if (batchesErr || !batches || batches.length === 0) {
        return NextResponse.json({ error: "No stock available for this product" }, { status: 400 });
      }

      for (const b of batches) {
        if (remainingToRemove <= 0) break;
        const removeAmt = Math.min(b.quantity, remainingToRemove);
        removedBatches.push({ id: b.id, removeAmt, purchasePrice: b.purchasePrice, expiryDate: b.expiryDate });
        remainingToRemove -= removeAmt;
      }
    }

    if (removedBatches.length === 0) {
      return NextResponse.json({ error: "Unable to find stock to remove" }, { status: 400 });
    }

    // ── Step 1: Update batch quantities in DB ──
    for (const rb of removedBatches) {
      const { data: current } = await supabase
        .from("Batch")
        .select("quantity")
        .eq("id", rb.id)
        .single();
      
      if (current) {
        const newQty = Math.max(0, current.quantity - rb.removeAmt);
        await supabase
          .from("Batch")
          .update({ quantity: newQty })
          .eq("id", rb.id);
      }
    }

    // ── Step 2: Record sale in Sales table with recovered amount ──
    const today = new Date();
    const salesRecords = removedBatches.map(rb => {
      // Calculate if this sale is recovering value from critical/expired batch 
      const dt = new Date(rb.expiryDate);
      const daysToExpiry = Math.ceil((dt.getTime() - today.getTime()) / 86400000);
      const isCriticalSale = daysToExpiry <= 30; // Was critical or expired at time of sale
      const recoveredAmount = isCriticalSale && rb.purchasePrice ? rb.removeAmt * rb.purchasePrice : 0;

      return {
        shopId: body.shopId,
        productId: productId,
        batchId: rb.id,
        productName: body.productName,
        quantity: rb.removeAmt,
        user_id: userId,
        recoveredAmount: Math.round(recoveredAmount * 100) / 100,
        temp_recovered: Math.round(recoveredAmount * 100) / 100 // internal use
      };
    });

    const { error: salesErr } = await supabase.from("Sales").insert(salesRecords.map(r => {
      const { temp_recovered, ...rest } = r;
      return rest;
    }));
    
    if (salesErr && salesErr.code === '42703') { // Column missing
        await supabase.from("Sales").insert(salesRecords.map(r => ({
            shopId: r.shopId,
            productId: r.productId,
            batchId: r.batchId,
            productName: r.productName,
            quantity: r.quantity
        })));
    } else if (salesErr) {
      console.warn("Sales insert warning:", salesErr.message);
    }

    const totalRemoved = body.quantity - remainingToRemove;
    const totalRecovered = salesRecords.reduce((s, r) => s + (r.temp_recovered || 0), 0);

    return NextResponse.json({ 
      success: true,
      removed: totalRemoved,
      unfulfilled: remainingToRemove,
      recoveredAmount: totalRecovered,
      message: remainingToRemove > 0
        ? `Only ${totalRemoved} units were available. ${remainingToRemove} units could not be fulfilled.`
        : `Successfully removed ${totalRemoved} units.${totalRecovered > 0 ? ` ₹${totalRecovered} recovered from critical stock.` : ''}`,
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("remove-product error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
