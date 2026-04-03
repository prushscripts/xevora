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
