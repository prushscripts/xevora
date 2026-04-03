-- Patch workers table with missing columns
ALTER TABLE public.workers 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS worker_type text DEFAULT '1099',
  ADD COLUMN IF NOT EXISTS pay_type text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS pay_rate numeric,
  ADD COLUMN IF NOT EXISTS ot_pay_rate numeric,
  ADD COLUMN IF NOT EXISTS flat_weekly_rate numeric,
  ADD COLUMN IF NOT EXISTS ot_bonus_rate numeric,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS default_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vault_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vault_percentage numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add constraint if not exists
DO $$ BEGIN
  ALTER TABLE public.workers ADD CONSTRAINT workers_pay_type_check 
    CHECK (pay_type IN ('hourly', 'flat_weekly'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.workers ADD CONSTRAINT workers_worker_type_check 
    CHECK (worker_type IN ('1099', 'w2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Patch shifts table with missing columns
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_period_id uuid REFERENCES public.pay_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clock_in_lat numeric,
  ADD COLUMN IF NOT EXISTS clock_in_lng numeric,
  ADD COLUMN IF NOT EXISTS clock_out_lat numeric,
  ADD COLUMN IF NOT EXISTS clock_out_lng numeric,
  ADD COLUMN IF NOT EXISTS gps_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS within_geofence boolean,
  ADD COLUMN IF NOT EXISTS meal_breaks jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS regular_hours numeric,
  ADD COLUMN IF NOT EXISTS ot_hours numeric,
  ADD COLUMN IF NOT EXISTS total_hours numeric,
  ADD COLUMN IF NOT EXISTS gross_pay numeric,
  ADD COLUMN IF NOT EXISTS billable_amount numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS original_clock_in timestamptz,
  ADD COLUMN IF NOT EXISTS original_clock_out timestamptz,
  ADD COLUMN IF NOT EXISTS original_meal_breaks jsonb,
  ADD COLUMN IF NOT EXISTS edit_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_note text,
  ADD COLUMN IF NOT EXISTS edit_status text,
  ADD COLUMN IF NOT EXISTS edit_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS edit_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_rejection_note text;

DO $$ BEGIN
  ALTER TABLE public.shifts ADD CONSTRAINT shifts_edit_status_check
    CHECK (edit_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Drop old trucks table dependency if hourly_rate column exists on workers
ALTER TABLE public.workers DROP COLUMN IF EXISTS hourly_rate;
ALTER TABLE public.workers DROP COLUMN IF EXISTS truck_id;
