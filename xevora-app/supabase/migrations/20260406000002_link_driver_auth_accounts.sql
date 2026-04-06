-- STEP 1: Create auth users in Supabase Dashboard
-- ================================================
-- Go to: Supabase Dashboard > Authentication > Users > Add User
-- 
-- Create user 1:
--   Email: joseph@prushlogistics.com
--   Password: [Generate secure temporary password]
--   Auto Confirm User: YES
--   Note the returned UUID
--
-- Create user 2:
--   Email: mark@prushlogistics.com
--   Password: [Generate secure temporary password]
--   Auto Confirm User: YES
--   Note the returned UUID
--
-- STEP 2: Run the UPDATE statements below
-- ================================================
-- Replace <joseph_auth_uuid> and <mark_auth_uuid> with actual UUIDs from Step 1

-- Link Joseph Pedro to his auth account
UPDATE public.workers 
SET user_id = '<joseph_auth_uuid>', 
    email = 'joseph@prushlogistics.com'
WHERE id = '325ed83b-fe63-4828-ab29-65928676d49e';

-- Link Mark Parra to his auth account
UPDATE public.workers 
SET user_id = '<mark_auth_uuid>', 
    email = 'mark@prushlogistics.com'  
WHERE id = 'd0b14d81-3ce3-4b5a-bb03-3ee71b3333c1';

-- STEP 3: Verify the links
-- ================================================
-- Run this query to confirm both workers now have user_id values:
SELECT id, first_name, last_name, email, user_id 
FROM public.workers 
WHERE id IN ('325ed83b-fe63-4828-ab29-65928676d49e', 'd0b14d81-3ce3-4b5a-bb03-3ee71b3333c1');
