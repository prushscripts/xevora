-- Add function to verify driver signup code for mobile app authentication
-- This allows the mobile app to check if a plaintext code matches the hashed digest

CREATE OR REPLACE FUNCTION public.verify_driver_signup_code(p_plaincode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  company_record RECORD;
BEGIN
  -- Validate input
  IF p_plaincode IS NULL OR trim(p_plaincode) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_code');
  END IF;

  -- Find company with matching code digest
  SELECT id, name, driver_signup_code_digest
  INTO company_record
  FROM public.companies
  WHERE driver_signup_code_digest IS NOT NULL
    AND driver_signup_code_digest = crypt(trim(p_plaincode), driver_signup_code_digest);

  -- If no match found
  IF company_record.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- Return company info
  RETURN jsonb_build_object(
    'ok', true,
    'company_id', company_record.id,
    'company_name', company_record.name
  );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.verify_driver_signup_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_driver_signup_code(text) TO anon;
