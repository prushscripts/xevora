ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS driver_invite_code text;

UPDATE public.companies
SET driver_invite_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 6))
WHERE driver_invite_code IS NULL;

CREATE OR REPLACE FUNCTION public.join_company_with_invite_code(
  p_code text,
  p_user_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_company public.companies%ROWTYPE;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Missing user id');
  END IF;

  SELECT * INTO v_company
  FROM public.companies
  WHERE UPPER(driver_invite_code) = UPPER(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.workers WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'already_registered');
  END IF;

  INSERT INTO public.workers (user_id, company_id, first_name, last_name, role, pay_type)
  VALUES (
    p_user_id,
    v_company.id,
    COALESCE(NULLIF(trim(p_first_name), ''), 'Driver'),
    COALESCE(NULLIF(trim(p_last_name), ''), COALESCE(NULLIF(trim(p_first_name), ''), 'Driver')),
    'driver',
    '1099'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'company_id', v_company.id, 'company_name', v_company.name);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.join_company_with_invite_code(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_company_with_invite_code(text, uuid, text, text) TO authenticated;
