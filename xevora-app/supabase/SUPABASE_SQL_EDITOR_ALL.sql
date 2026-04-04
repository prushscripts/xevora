-- =============================================================================
-- XEVORA WORKFORCE — paste this entire file into Supabase → SQL Editor → Run
-- =============================================================================
--
-- BEFORE YOU RUN:
--   • You must already have public.companies and public.workers (from your app
--     onboarding or existing schema). This script does NOT create those tables.
--
-- DO NOT RUN: supabase/migrations/003_patch_workforce.sql — it drops hourly_rate
-- and truck_id and will break the current app.
--
-- AFTER SUCCESS: Dashboard → Project Settings → API → reload schema if PostgREST
-- still shows stale errors (optional; usually auto-refreshes).
--
-- ORDER: driver portal → workforce (clients, RLS, …) → driver access code RPCs
--        → optional Prush seed
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Safety: register_driver_with_code inserts workers.status
-- -----------------------------------------------------------------------------
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- =============================================================================
-- 1) 20260211140000_driver_portal.sql
-- =============================================================================

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

-- =============================================================================
-- 2) 001_workforce_schema.sql
-- =============================================================================

-- P1-S6 Workforce: clients, worker_clients, weekly_summaries, vault_entries, audit_log
-- Extends companies, workers, shifts. Idempotent ADD COLUMN / IF NOT EXISTS.
-- Run after existing driver_portal migration (or merge order: run 202602* first, then this).

-- ---------------------------------------------------------------------------
-- companies — workforce columns
-- ---------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN pay_period text DEFAULT 'weekly'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN pay_period_start text DEFAULT 'monday'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN ot_weekly_threshold numeric DEFAULT 40; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN ot_rate_multiplier numeric DEFAULT 1.5; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN gps_enabled boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.companies ADD COLUMN vault_enabled boolean DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  address text,
  lat numeric,
  lng numeric,
  geofence_radius_meters integer NOT NULL DEFAULT 300,
  gps_enforcement text NOT NULL DEFAULT 'warn' CHECK (gps_enforcement IN ('warn', 'block', 'off')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_abbreviation_upper CHECK (abbreviation = upper(abbreviation)),
  CONSTRAINT clients_abbreviation_len CHECK (char_length(abbreviation) <= 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_company_abbreviation_uidx ON public.clients (company_id, abbreviation);
CREATE INDEX IF NOT EXISTS clients_company_id_idx ON public.clients (company_id);

-- ---------------------------------------------------------------------------
-- workers — workforce columns (preserve existing driver_portal columns)
-- ---------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN email text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN phone text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN worker_type text DEFAULT '1099' CHECK (worker_type IN ('1099', 'w2')); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN pay_type text DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'flat_weekly')); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN pay_rate numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN ot_pay_rate numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN flat_weekly_rate numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN ot_bonus_rate numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN default_client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN vault_enabled boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workers ADD COLUMN vault_percentage numeric DEFAULT 20; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Replace legacy pay_type CHECK (e.g. hourly/salary only) when column pre-existed and ADD COLUMN was skipped.
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_pay_type_check;
ALTER TABLE public.workers ADD CONSTRAINT workers_pay_type_check
  CHECK (pay_type IS NULL OR pay_type IN ('hourly', 'flat_weekly', 'salary'));

-- ---------------------------------------------------------------------------
-- worker_clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  billing_rate numeric NOT NULL,
  ot_billing_rate numeric NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE (worker_id, client_id)
);

CREATE INDEX IF NOT EXISTS worker_clients_worker_idx ON public.worker_clients (worker_id);
CREATE INDEX IF NOT EXISTS worker_clients_client_idx ON public.worker_clients (client_id);

-- FK default_client_id after clients exists (already added nullable)

-- ---------------------------------------------------------------------------
-- pay_periods — ensure table exists (driver_portal); align status if needed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- shifts — workforce columns
-- ---------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN gps_verified boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN within_geofence boolean; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN meal_breaks jsonb DEFAULT '[]'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN regular_hours numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN ot_hours numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN gross_pay numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN billable_amount numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.shifts ADD COLUMN notes text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check CHECK (status IN ('active', 'completed', 'flagged', 'approved'));

CREATE INDEX IF NOT EXISTS shifts_client_id_idx ON public.shifts (client_id);

-- ---------------------------------------------------------------------------
-- weekly_summaries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id) ON DELETE CASCADE,
  total_hours numeric NOT NULL DEFAULT 0,
  regular_hours numeric NOT NULL DEFAULT 0,
  ot_hours numeric NOT NULL DEFAULT 0,
  flat_weekly_rate numeric,
  ot_bonus_amount numeric NOT NULL DEFAULT 0,
  ot_bonus_note text,
  final_approved_pay numeric NOT NULL DEFAULT 0,
  total_client_billing numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'locked')),
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, pay_period_id)
);

CREATE INDEX IF NOT EXISTS weekly_summaries_company_idx ON public.weekly_summaries (company_id);

-- ---------------------------------------------------------------------------
-- vault_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id) ON DELETE CASCADE,
  gross_pay numeric NOT NULL,
  suggested_percentage numeric,
  actual_percentage numeric,
  vault_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'withdrawn')),
  ai_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vault_entries_worker_idx ON public.vault_entries (worker_id);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_company_idx ON public.audit_log (company_id);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_accessible_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.company_id FROM public.workers w WHERE w.user_id = auth.uid()
  UNION
  SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_worker_row()
RETURNS public.workers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.owner_id = uid
  ) OR EXISTS (
    SELECT 1 FROM public.workers w WHERE w.user_id = uid AND w.role IN ('admin', 'manager')
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- clients policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;

CREATE POLICY clients_select ON public.clients FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids())
);

CREATE POLICY clients_insert ON public.clients FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND public.is_company_staff(auth.uid())
);

CREATE POLICY clients_update ON public.clients FOR UPDATE USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND public.is_company_staff(auth.uid())
);

CREATE POLICY clients_delete ON public.clients FOR DELETE USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND public.is_company_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- worker_clients policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS wc_select ON public.worker_clients;
CREATE POLICY wc_select ON public.worker_clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workers w WHERE w.id = worker_clients.worker_id AND w.user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = worker_clients.worker_id AND w.company_id IN (SELECT public.user_accessible_company_ids())
    )
    AND public.is_company_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS wc_insert ON public.worker_clients;
CREATE POLICY wc_insert ON public.worker_clients FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = worker_clients.worker_id AND w.company_id IN (SELECT public.user_accessible_company_ids())
  )
  AND public.is_company_staff(auth.uid())
);

DROP POLICY IF EXISTS wc_update ON public.worker_clients;
CREATE POLICY wc_update ON public.worker_clients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = worker_clients.worker_id AND w.company_id IN (SELECT public.user_accessible_company_ids())
  )
  AND public.is_company_staff(auth.uid())
);

DROP POLICY IF EXISTS wc_delete ON public.worker_clients;
CREATE POLICY wc_delete ON public.worker_clients FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = worker_clients.worker_id AND w.company_id IN (SELECT public.user_accessible_company_ids())
  )
  AND public.is_company_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- weekly_summaries
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ws_select ON public.weekly_summaries;
DROP POLICY IF EXISTS ws_insert ON public.weekly_summaries;
DROP POLICY IF EXISTS ws_update ON public.weekly_summaries;
DROP POLICY IF EXISTS ws_delete ON public.weekly_summaries;

CREATE POLICY ws_select ON public.weekly_summaries FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY ws_insert ON public.weekly_summaries FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

CREATE POLICY ws_update ON public.weekly_summaries FOR UPDATE USING (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

CREATE POLICY ws_delete ON public.weekly_summaries FOR DELETE USING (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- vault_entries
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ve_select ON public.vault_entries;
CREATE POLICY ve_select ON public.vault_entries FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
  )
);

DROP POLICY IF EXISTS ve_insert ON public.vault_entries;
CREATE POLICY ve_insert ON public.vault_entries FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY ve_update ON public.vault_entries FOR UPDATE USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
  )
);

-- ---------------------------------------------------------------------------
-- audit_log (staff only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS al_select ON public.audit_log;
CREATE POLICY al_select ON public.audit_log FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

DROP POLICY IF EXISTS al_insert ON public.audit_log;
CREATE POLICY al_insert ON public.audit_log FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- shifts — replace policies (driver-scoped read/write)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS shifts_select ON public.shifts;
DROP POLICY IF EXISTS shifts_insert ON public.shifts;
DROP POLICY IF EXISTS shifts_update ON public.shifts;

CREATE POLICY shifts_select ON public.shifts FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_id = auth.uid() AND c.id = shifts.company_id)
    OR worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY shifts_insert ON public.shifts FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    (
      worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.workers w2 WHERE w2.id = shifts.worker_id AND w2.user_id = auth.uid())
    )
    OR public.is_company_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_id = auth.uid() AND c.id = shifts.company_id)
  )
);

CREATE POLICY shifts_update ON public.shifts FOR UPDATE USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    (
      worker_id = (SELECT w.id FROM public.workers w WHERE w.user_id = auth.uid() LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.workers w2 WHERE w2.id = shifts.worker_id AND w2.user_id = auth.uid())
    )
    OR public.is_company_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_id = auth.uid() AND c.id = shifts.company_id)
  )
);

-- ---------------------------------------------------------------------------
-- workers — drivers read only self; staff full company (replace prior broad select)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS workers_select ON public.workers;
CREATE POLICY workers_select ON public.workers FOR SELECT USING (
  company_id IN (SELECT public.user_accessible_company_ids())
  AND (
    public.is_company_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_id = auth.uid() AND c.id = workers.company_id)
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workers_insert ON public.workers;
CREATE POLICY workers_insert ON public.workers FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
);

DROP POLICY IF EXISTS workers_update ON public.workers;
CREATE POLICY workers_update ON public.workers FOR UPDATE USING (
  user_id = auth.uid()
  OR (
    company_id IN (SELECT public.user_accessible_company_ids()) AND public.is_company_staff(auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.worker_clients TO authenticated;
GRANT ALL ON public.weekly_summaries TO authenticated;
GRANT ALL ON public.vault_entries TO authenticated;
GRANT ALL ON public.audit_log TO authenticated;

-- =============================================================================
-- 3) 20260403190000_driver_company_access_code.sql (pgcrypto + RPCs; Supabase-safe)
-- =============================================================================

-- Driver self-serve: company access code (bcrypt digest) + RPCs to set (staff) and consume (authenticated new user)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$ BEGIN
  ALTER TABLE public.companies ADD COLUMN driver_signup_code_digest text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.companies.driver_signup_code_digest IS 'bcrypt digest for driver self-registration; plaintext never stored';

-- Staff: set or clear code for a company (owner, admin, or manager)
CREATE OR REPLACE FUNCTION public.set_driver_signup_code(p_company_id uuid, p_plaincode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  allowed boolean;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_company');
  END IF;

  allowed := EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.company_id = p_company_id
      AND w.user_id = auth.uid()
      AND w.role IN ('admin', 'manager')
  );

  IF NOT allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_plaincode IS NOT NULL AND trim(p_plaincode) = '' THEN
    UPDATE public.companies SET driver_signup_code_digest = NULL WHERE id = p_company_id;
    RETURN jsonb_build_object('ok', true, 'cleared', true);
  END IF;

  IF p_plaincode IS NULL OR length(trim(p_plaincode)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_too_short');
  END IF;

  UPDATE public.companies
  SET driver_signup_code_digest = crypt(trim(p_plaincode), gen_salt('bf'::text))
  WHERE id = p_company_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_driver_signup_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_driver_signup_code(uuid, text) TO authenticated;

-- Authenticated user links auth account to company as driver (RLS-safe via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.register_driver_with_code(p_full_name text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cid uuid;
  uid uuid := auth.uid();
  raw_name text;
  fn text;
  ln text;
  sp int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.workers WHERE user_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_registered');
  END IF;

  IF EXISTS (SELECT 1 FROM public.companies WHERE owner_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'use_admin_portal');
  END IF;

  SELECT c.id INTO cid
  FROM public.companies c
  WHERE c.driver_signup_code_digest IS NOT NULL
    AND crypt(trim(p_code), c.driver_signup_code_digest) = c.driver_signup_code_digest
  LIMIT 1;

  IF cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  raw_name := COALESCE(nullif(trim(p_full_name), ''), 'Driver');
  fn := split_part(raw_name, ' ', 1);
  sp := position(' ' in raw_name);
  IF sp = 0 THEN
    ln := fn;
  ELSE
    ln := trim(substring(raw_name from sp + 1));
    IF ln = '' THEN
      ln := fn;
    END IF;
  END IF;

  INSERT INTO public.workers (company_id, user_id, first_name, last_name, full_name, role, status)
  VALUES (
    cid,
    uid,
    fn,
    ln,
    raw_name,
    'driver',
    'active'
  );

  RETURN jsonb_build_object('ok', true, 'company_id', cid);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate');
END;
$$;

REVOKE ALL ON FUNCTION public.register_driver_with_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_driver_with_code(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_signup_status(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  allowed boolean;
  configured boolean;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_company');
  END IF;

  allowed := EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.company_id = p_company_id
      AND w.user_id = auth.uid()
      AND w.role IN ('admin', 'manager')
  );

  IF NOT allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT (c.driver_signup_code_digest IS NOT NULL) INTO configured
  FROM public.companies c
  WHERE c.id = p_company_id;

  RETURN jsonb_build_object('ok', true, 'configured', coalesce(configured, false));
END;
$$;

REVOKE ALL ON FUNCTION public.get_driver_signup_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driver_signup_status(uuid) TO authenticated;

-- =============================================================================
-- 4) OPTIONAL — 002_seed_prush.sql (demo data; skips if email / company missing)
-- =============================================================================

-- Seed Prush Logistics demo data (idempotent).
-- Requires: a companies row owned by james@prushlogistics.com (or adjust email below).

DO $$
DECLARE
  cid uuid;
  cl_id uuid;
  wid_j uuid;
  wid_m uuid;
  owner_uid uuid;
BEGIN
  SELECT u.id INTO owner_uid FROM auth.users u WHERE u.email ILIKE 'james@prushlogistics.com' LIMIT 1;

  IF owner_uid IS NULL THEN
    RAISE NOTICE '002_seed_prush: no auth user james@prushlogistics.com — skip seed.';
    RETURN;
  END IF;

  SELECT c.id INTO cid FROM public.companies c WHERE c.owner_id = owner_uid ORDER BY c.id LIMIT 1;

  IF cid IS NULL THEN
    RAISE NOTICE '002_seed_prush: no company for that owner — complete onboarding first.';
    RETURN;
  END IF;

  UPDATE public.companies
  SET
    pay_period = COALESCE(pay_period, 'weekly'),
    pay_period_start = COALESCE(pay_period_start, 'monday'),
    ot_weekly_threshold = COALESCE(ot_weekly_threshold, 40),
    ot_rate_multiplier = COALESCE(ot_rate_multiplier, 1.5),
    gps_enabled = COALESCE(gps_enabled, true),
    vault_enabled = COALESCE(vault_enabled, true)
  WHERE id = cid;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE company_id = cid AND abbreviation = 'HBFORD') THEN
    INSERT INTO public.clients (company_id, name, abbreviation, address, lat, lng, geofence_radius_meters, gps_enforcement, active)
    VALUES (cid, 'Healey Brothers Ford', 'HBFORD', 'Goshen, NY', 41.4021, -74.3243, 300, 'warn', true);
  END IF;

  SELECT id INTO cl_id FROM public.clients WHERE company_id = cid AND abbreviation = 'HBFORD' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE company_id = cid AND lower(email) = lower('joseph.pedro.demo@xevora.local')) THEN
    INSERT INTO public.workers (
      company_id, first_name, last_name, full_name, email, role, worker_type, pay_type, flat_weekly_rate, ot_bonus_rate, status, default_client_id
    )
    VALUES (
      cid, 'Joseph', 'Pedro', 'Joseph Pedro', 'joseph.pedro.demo@xevora.local', 'driver', '1099', 'flat_weekly', 725, 15, 'active', cl_id
    )
    RETURNING id INTO wid_j;
  ELSE
    SELECT id INTO wid_j FROM public.workers WHERE company_id = cid AND lower(email) = lower('joseph.pedro.demo@xevora.local') LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE company_id = cid AND lower(email) = lower('mark.parra.demo@xevora.local')) THEN
    INSERT INTO public.workers (
      company_id, first_name, last_name, full_name, email, role, worker_type, pay_type, flat_weekly_rate, ot_bonus_rate, status, default_client_id
    )
    VALUES (
      cid, 'Mark', 'Parra', 'Mark Parra', 'mark.parra.demo@xevora.local', 'driver', '1099', 'flat_weekly', 725, 15, 'active', cl_id
    )
    RETURNING id INTO wid_m;
  ELSE
    SELECT id INTO wid_m FROM public.workers WHERE company_id = cid AND lower(email) = lower('mark.parra.demo@xevora.local') LIMIT 1;
  END IF;

  IF wid_j IS NOT NULL AND cl_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.worker_clients WHERE worker_id = wid_j AND client_id = cl_id) THEN
    INSERT INTO public.worker_clients (worker_id, client_id, billing_rate, ot_billing_rate, is_primary)
    VALUES (wid_j, cl_id, 40, 60, true);
  END IF;

  IF wid_m IS NOT NULL AND cl_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.worker_clients WHERE worker_id = wid_m AND client_id = cl_id) THEN
    INSERT INTO public.worker_clients (worker_id, client_id, billing_rate, ot_billing_rate, is_primary)
    VALUES (wid_m, cl_id, 40, 60, true);
  END IF;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================
