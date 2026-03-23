import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/twilio";
import { setSession } from "@/lib/sessionStore";
import { resolveShopIdFromAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const shopId = await resolveShopIdFromAuth();
    if (!shopId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { productId, quantity } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    // Get the product and shop details
    const { data: product } = await supabase
      .from("Product")
      .select("name, shopId")
      .eq("id", productId)
      .eq("shopId", shopId)
      .single();

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const { data: shop } = await supabase
      .from("Shop")
      .select("name, whatsappNum")
      .eq("id", shopId)
      .single();

    // Get last distributor for this product
    const { data: lastBatch } = await supabase
      .from("Batch")
      .select("distributor:Distributor(*)")
      .eq("productId", productId)
      .not("distributorId", "is", null)
      .order("expiryDate", { ascending: false })
      .limit(1)
      .single();

    const distributorName = (lastBatch?.distributor as any)?.name || "Distributor";
    
    // For demo purposes, we send the message to the OWNER_PHONE to act as the distributor
    const targetPhone = process.env.OWNER_PHONE || shop?.whatsappNum;

    if (!targetPhone) {
      return NextResponse.json({ error: "No target phone configured" }, { status: 400 });
    }

    const qtyStr = quantity ? ` *${quantity} units* of` : "";
    const message = `🔔 *Restock Request*\n\nHi ${distributorName},\n\n*${shop?.name}* has requested a restock of${qtyStr} *${product.name}*.\n\nCurrent Stock: ${body.currentStock ?? "Low"}\n\nReply *YES* to confirm you can supply this or *NO* to decline.`;

    await sendWhatsApp(targetPhone, message);

    // Set the session state to await distributor response
    // Strip whatsapp: from targetPhone
    const phoneNormal = targetPhone.replace("whatsapp:", "");
    setSession(phoneNormal, {
      step: "awaiting_restock_outcome",
      productId,
      productName: product.name,
      shopName: shop?.name || "Shop",
      distributorName,
    });

    return NextResponse.json({ success: true, message: "Notification sent to distributor" });
  } catch (error: any) {
    console.error("Restock error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
