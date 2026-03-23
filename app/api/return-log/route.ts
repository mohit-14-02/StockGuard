import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const LogSchema = z.object({
  batchId: z.string().uuid(),
  distributorId: z.string().uuid(),
  outcome: z.enum(["pending", "accepted", "rejected"]).default("pending"),
});

async function getAuthUserId() {
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
  const { data } = await supabaseServer.auth.getUser();
  return data.user?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = LogSchema.parse(await req.json());
    const userId = await getAuthUserId();

    const { data: returnLog, error } = await supabase
      .from("ReturnLog")
      .insert({
        batchId: body.batchId,
        distributorId: body.distributorId,
        outcome: body.outcome,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ returnLog });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
