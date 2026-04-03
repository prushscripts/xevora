-- P1-S6 Driver Portal — trucks, pay_periods, shifts; workers extensions; RLS
-- Requires public.companies and public.workers (existing). Safe to re-run: uses IF NOT EXISTS / DO blocks where needed.

-- ---------------------------------------------------------------------------
-- trucks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  label text NOT NULL,
  vin text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trucks_company_id_idx ON public.trucks (company_id);

-- ---------------------------------------------------------------------------
-- pay_periods
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pay_periods_company_id_idx ON public.pay_periods (company_id);

-- ---------------------------------------------------------------------------
-- workers — add columns (table assumed to exist)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.workers ADD COLUMN user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.workers ADD COLUMN full_name text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workers' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.workers ADD COLUMN role text DEFAULT 'admin';
    UPDATE public.workers SET role = 'admin' WHERE role IS NULL;
    ALTER TABLE public.workers ALTER COLUMN role SET NOT NULL;
    ALTER TABLE public.workers ADD CONSTRAINT workers_role_check CHECK (role IN ('admin', 'manager', 'driver'));
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.workers ADD COLUMN truck_id uuid REFERENCES public.trucks (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.workers ADD COLUMN hourly_rate numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.workers ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  clock_in_lat numeric,
  clock_in_lng numeric,
  clock_out_lat numeric,
  clock_out_lng numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'flagged')),
  total_hours numeric,
  pay_period_id uuid REFERENCES public.pay_periods (id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shifts_company_id_idx ON public.shifts (company_id);
CREATE INDEX IF NOT EXISTS shifts_worker_id_idx ON public.shifts (worker_id);
CREATE INDEX IF NOT EXISTS shifts_status_idx ON public.shifts (status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- workers may already have RLS; enable if not
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Helper: company ids the current user may access (worker row OR company owner)
CREATE OR REPLACE FUNCTION public.user_accessible_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.company_id
  FROM public.workers w
  WHERE w.user_id = auth.uid()
  UNION
  SELECT c.id
  FROM public.companies c
  WHERE c.owner_id = auth.uid();
$$;

-- trucks
DROP POLICY IF EXISTS trucks_select ON public.trucks;
CREATE POLICY trucks_select ON public.trucks FOR SELECT USING (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS trucks_insert ON public.trucks;
CREATE POLICY trucks_insert ON public.trucks FOR INSERT WITH CHECK (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS trucks_update ON public.trucks;
CREATE POLICY trucks_update ON public.trucks FOR UPDATE USING (company_id IN (SELECT public.user_accessible_company_ids()));

-- pay_periods
DROP POLICY IF EXISTS pay_periods_select ON public.pay_periods;
CREATE POLICY pay_periods_select ON public.pay_periods FOR SELECT USING (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS pay_periods_insert ON public.pay_periods;
CREATE POLICY pay_periods_insert ON public.pay_periods FOR INSERT WITH CHECK (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS pay_periods_update ON public.pay_periods;
CREATE POLICY pay_periods_update ON public.pay_periods FOR UPDATE USING (company_id IN (SELECT public.user_accessible_company_ids()));

-- shifts
DROP POLICY IF EXISTS shifts_select ON public.shifts;
CREATE POLICY shifts_select ON public.shifts FOR SELECT USING (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS shifts_insert ON public.shifts;
CREATE POLICY shifts_insert ON public.shifts FOR INSERT WITH CHECK (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS shifts_update ON public.shifts;
CREATE POLICY shifts_update ON public.shifts FOR UPDATE USING (company_id IN (SELECT public.user_accessible_company_ids()));

-- workers — replace broad policies if any; scoped to accessible companies
DROP POLICY IF EXISTS workers_select ON public.workers;
CREATE POLICY workers_select ON public.workers FOR SELECT USING (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS workers_insert ON public.workers;
CREATE POLICY workers_insert ON public.workers FOR INSERT WITH CHECK (company_id IN (SELECT public.user_accessible_company_ids()));
DROP POLICY IF EXISTS workers_update ON public.workers;
CREATE POLICY workers_update ON public.workers FOR UPDATE USING (company_id IN (SELECT public.user_accessible_company_ids()));

-- Grant usage (Supabase typically grants anon/authenticated already on public)
GRANT ALL ON public.trucks TO authenticated;
GRANT ALL ON public.pay_periods TO authenticated;
GRANT ALL ON public.shifts TO authenticated;
