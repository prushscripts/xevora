-- Fix: "function gen_salt(unknown) does not exist" when saving driver access code.
-- On Supabase, pgcrypto's crypt/gen_salt live in schema `extensions`. The RPCs used
-- SET search_path = public only, so those functions were not visible. Also cast the
-- algorithm literal to text so the correct overload is chosen.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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

CREATE OR REPLACE FUNCTION public.register_driver_with_code(p_full_name text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cid uuid;
  uid uuid := auth.uid();
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

  INSERT INTO public.workers (company_id, user_id, full_name, role, status)
  VALUES (
    cid,
    uid,
    COALESCE(nullif(trim(p_full_name), ''), 'Driver'),
    'driver',
    'active'
  );

  RETURN jsonb_build_object('ok', true, 'company_id', cid);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate');
END;
$$;

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

REVOKE ALL ON FUNCTION public.set_driver_signup_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_driver_signup_code(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.register_driver_with_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_driver_with_code(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_driver_signup_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driver_signup_status(uuid) TO authenticated;
