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
      company_id, full_name, email, role, worker_type, pay_type, flat_weekly_rate, ot_bonus_rate, status, default_client_id
    )
    VALUES (
      cid, 'Joseph Pedro', 'joseph.pedro.demo@xevora.local', 'driver', '1099', 'flat_weekly', 725, 15, 'active', cl_id
    )
    RETURNING id INTO wid_j;
  ELSE
    SELECT id INTO wid_j FROM public.workers WHERE company_id = cid AND lower(email) = lower('joseph.pedro.demo@xevora.local') LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE company_id = cid AND lower(email) = lower('mark.parra.demo@xevora.local')) THEN
    INSERT INTO public.workers (
      company_id, full_name, email, role, worker_type, pay_type, flat_weekly_rate, ot_bonus_rate, status, default_client_id
    )
    VALUES (
      cid, 'Mark Parra', 'mark.parra.demo@xevora.local', 'driver', '1099', 'flat_weekly', 725, 15, 'active', cl_id
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
