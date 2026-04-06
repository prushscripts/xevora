-- STEP 1: Delete test auth users in Supabase Dashboard
-- ======================================================
-- Go to: Supabase Dashboard > Authentication > Users
-- 
-- Delete user: merchtophat@gmail.com
-- Delete user: prush@mail.com
--
-- STEP 2: Clean up worker records
-- ======================================================
-- Remove any worker records associated with these test accounts

DELETE FROM public.workers 
WHERE email IN ('merchtophat@gmail.com', 'prush@mail.com');

-- STEP 3: Verify cleanup
-- ======================================================
-- Run this query to confirm no worker records remain for test accounts:
SELECT id, first_name, last_name, email, user_id 
FROM public.workers 
WHERE email IN ('merchtophat@gmail.com', 'prush@mail.com');
-- Should return 0 rows
