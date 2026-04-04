-- Function to create driver account during mobile signup
-- This bypasses RLS since it runs with SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.create_driver_account(
  p_user_id uuid,
  p_company_id uuid,
  p_full_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_parts text[];
  first_name text;
  last_name text;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_company_id IS NULL OR p_full_name IS NULL OR p_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_required_fields');
  END IF;

  -- Split full name into first and last
  name_parts := string_to_array(trim(p_full_name), ' ');
  first_name := name_parts[1];
  last_name := CASE 
    WHEN array_length(name_parts, 1) > 1 THEN array_to_string(name_parts[2:], ' ')
    ELSE ''
  END;

  -- Insert worker record
  INSERT INTO public.workers (
    id,
    user_id,
    company_id,
    first_name,
    last_name,
    full_name,
    email,
    role,
    worker_type,
    status
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_company_id,
    first_name,
    last_name,
    trim(p_full_name),
    trim(p_email),
    'driver',
    '1099',
    'active'
  );

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users (they just signed up)
GRANT EXECUTE ON FUNCTION public.create_driver_account(uuid, uuid, text, text) TO authenticated;
