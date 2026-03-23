-- ============================================================
-- StockGuard: Multi-User Data Isolation with Row Level Security (RLS)
-- Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- This migration adds user_id columns to all data tables and
-- creates RLS policies so each user can only see their own data.
-- ============================================================

-- ─── 1. Add user_id to existing tables ──────────────────────

-- Add user_id to Shop table
ALTER TABLE public."Shop" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to Product table
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to Batch table
ALTER TABLE public."Batch" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to Sales table
ALTER TABLE public."Sales" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to Distributor table
ALTER TABLE public."Distributor" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to ReturnLog table
ALTER TABLE public."ReturnLog" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add recoveredAmount to Sales table (tracks value recovered from critical/expired batch sales)
ALTER TABLE public."Sales" ADD COLUMN IF NOT EXISTS "recoveredAmount" numeric DEFAULT 0;

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    shop_name text,
    business_category text,
    phone text,
    address text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Ensure profiles table has RLS for user isolation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── 2. Create indexes for performance ──────────────────────

CREATE INDEX IF NOT EXISTS idx_shop_user_id ON public."Shop" ("user_id");
CREATE INDEX IF NOT EXISTS idx_product_user_id ON public."Product" ("user_id");
CREATE INDEX IF NOT EXISTS idx_batch_user_id ON public."Batch" ("user_id");
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public."Sales" ("user_id");
CREATE INDEX IF NOT EXISTS idx_distributor_user_id ON public."Distributor" ("user_id");
CREATE INDEX IF NOT EXISTS idx_returnlog_user_id ON public."ReturnLog" ("user_id");

-- ─── 3. Enable RLS on all tables (if not already) ──────────

ALTER TABLE public."Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Distributor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReturnLog" ENABLE ROW LEVEL SECURITY;

-- ─── 4. Drop existing permissive policies ───────────────────
-- (These old policies allow ALL users to read/write ALL data)

-- Shop
DROP POLICY IF EXISTS "Allow public read on Shop" ON public."Shop";
DROP POLICY IF EXISTS "Allow public insert on Shop" ON public."Shop";
DROP POLICY IF EXISTS "Allow public update on Shop" ON public."Shop";

-- Product
DROP POLICY IF EXISTS "Allow public read on Product" ON public."Product";
DROP POLICY IF EXISTS "Allow public insert on Product" ON public."Product";
DROP POLICY IF EXISTS "Allow public update on Product" ON public."Product";

-- Batch
DROP POLICY IF EXISTS "Allow public read on Batch" ON public."Batch";
DROP POLICY IF EXISTS "Allow public insert on Batch" ON public."Batch";
DROP POLICY IF EXISTS "Allow public update on Batch" ON public."Batch";
DROP POLICY IF EXISTS "Allow public delete on Batch" ON public."Batch";

-- Sales (drop old open policies)
DROP POLICY IF EXISTS "Allow public read on Sales" ON public."Sales";
DROP POLICY IF EXISTS "Allow public insert on Sales" ON public."Sales";
DROP POLICY IF EXISTS "Allow public update on Sales" ON public."Sales";

-- Distributor
DROP POLICY IF EXISTS "Allow public read on Distributor" ON public."Distributor";
DROP POLICY IF EXISTS "Allow public insert on Distributor" ON public."Distributor";
DROP POLICY IF EXISTS "Allow public update on Distributor" ON public."Distributor";

-- ReturnLog
DROP POLICY IF EXISTS "Allow public read on ReturnLog" ON public."ReturnLog";
DROP POLICY IF EXISTS "Allow public insert on ReturnLog" ON public."ReturnLog";
DROP POLICY IF EXISTS "Allow public update on ReturnLog" ON public."ReturnLog";

-- ─── 5. Create secure RLS policies ──────────────────────────
-- Each user can only access rows where user_id = auth.uid()

-- Shop policies
CREATE POLICY "Users can view own shops"
    ON public."Shop" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own shops"
    ON public."Shop" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own shops"
    ON public."Shop" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can delete own shops"
    ON public."Shop" FOR DELETE
    USING (auth.uid() = "user_id");

-- Product policies
CREATE POLICY "Users can view own products"
    ON public."Product" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own products"
    ON public."Product" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own products"
    ON public."Product" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can delete own products"
    ON public."Product" FOR DELETE
    USING (auth.uid() = "user_id");

-- Batch policies
CREATE POLICY "Users can view own batches"
    ON public."Batch" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own batches"
    ON public."Batch" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own batches"
    ON public."Batch" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can delete own batches"
    ON public."Batch" FOR DELETE
    USING (auth.uid() = "user_id");

-- Sales policies
CREATE POLICY "Users can view own sales"
    ON public."Sales" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own sales"
    ON public."Sales" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own sales"
    ON public."Sales" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

-- Distributor policies
CREATE POLICY "Users can view own distributors"
    ON public."Distributor" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own distributors"
    ON public."Distributor" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own distributors"
    ON public."Distributor" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can delete own distributors"
    ON public."Distributor" FOR DELETE
    USING (auth.uid() = "user_id");

-- ReturnLog policies
CREATE POLICY "Users can view own return logs"
    ON public."ReturnLog" FOR SELECT
    USING (auth.uid() = "user_id");

CREATE POLICY "Users can insert own return logs"
    ON public."ReturnLog" FOR INSERT
    WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "Users can update own return logs"
    ON public."ReturnLog" FOR UPDATE
    USING (auth.uid() = "user_id")
    WITH CHECK (auth.uid() = "user_id");

-- ─── 6. Backfill existing data (optional) ───────────────────
-- If you have existing data, you'll need to assign user_ids.
-- This assigns all existing unassigned data to a default user.
-- You should run this ONCE after migration, customized for your setup.
-- 
-- Example (uncomment and modify):
-- UPDATE public."Shop" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
-- UPDATE public."Product" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
-- UPDATE public."Batch" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
-- UPDATE public."Sales" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
-- UPDATE public."Distributor" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
-- UPDATE public."ReturnLog" SET "user_id" = 'YOUR_USER_UUID' WHERE "user_id" IS NULL;
