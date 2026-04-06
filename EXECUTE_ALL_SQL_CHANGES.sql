-- ════════════════════════════════════════════════════════════════════════════
-- XEVORA REMEDIATION SQL SCRIPT
-- Execute against Supabase project: gvjcjofsglhnxvtymicf
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- ITEM 1: Add gps_accuracy column to shifts table
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS gps_accuracy float8 NULL;

COMMENT ON COLUMN public.shifts.gps_accuracy IS 'GPS accuracy in meters at time of clock-in';

-- ════════════════════════════════════════════════════════════════════════════
-- ITEM 6: Set onboarding_complete for Prush Logistics Group LLC
-- ════════════════════════════════════════════════════════════════════════════
UPDATE public.companies 
SET onboarding_complete = true 
WHERE id = '1c41630a-7792-4cac-9fa1-1b4a5f84f114';

-- ════════════════════════════════════════════════════════════════════════════
-- ITEM 7: Link driver auth accounts to workers
-- ════════════════════════════════════════════════════════════════════════════
-- MANUAL STEP REQUIRED FIRST:
-- 1. Go to Supabase Dashboard > Authentication > Users > Add User
-- 2. Create user: joseph@prushlogistics.com (auto-confirm, note UUID)
-- 3. Create user: mark@prushlogistics.com (auto-confirm, note UUID)
-- 4. Replace <joseph_auth_uuid> and <mark_auth_uuid> below with actual UUIDs
-- 5. Then uncomment and run these UPDATE statements:

-- UPDATE public.workers 
-- SET user_id = '<joseph_auth_uuid>', 
--     email = 'joseph@prushlogistics.com'
-- WHERE id = '325ed83b-fe63-4828-ab29-65928676d49e';

-- UPDATE public.workers 
-- SET user_id = '<mark_auth_uuid>', 
--     email = 'mark@prushlogistics.com'  
-- WHERE id = 'd0b14d81-3ce3-4b5a-bb03-3ee71b3333c1';

-- ════════════════════════════════════════════════════════════════════════════
-- ITEM 8: Clean up test accounts
-- ════════════════════════════════════════════════════════════════════════════
-- MANUAL STEP REQUIRED FIRST:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Delete user: merchtophat@gmail.com
-- 3. Delete user: prush@mail.com
-- 4. Then run this DELETE statement:

DELETE FROM public.workers 
WHERE email IN ('merchtophat@gmail.com', 'prush@mail.com');

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════════════════════

-- Verify gps_accuracy column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shifts' AND column_name = 'gps_accuracy';

-- Verify onboarding_complete is true for Prush Logistics
SELECT id, name, onboarding_complete 
FROM public.companies 
WHERE id = '1c41630a-7792-4cac-9fa1-1b4a5f84f114';

-- Verify driver accounts are linked (run after completing ITEM 7 manual steps)
SELECT id, first_name, last_name, email, user_id 
FROM public.workers 
WHERE id IN ('325ed83b-fe63-4828-ab29-65928676d49e', 'd0b14d81-3ce3-4b5a-bb03-3ee71b3333c1');

-- Verify test accounts are removed (run after completing ITEM 8 manual steps)
SELECT id, first_name, last_name, email 
FROM public.workers 
WHERE email IN ('merchtophat@gmail.com', 'prush@mail.com');
-- Should return 0 rows
