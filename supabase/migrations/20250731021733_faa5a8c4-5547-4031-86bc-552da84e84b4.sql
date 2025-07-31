-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create the optimized policy with subquery
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

-- Also update the other policies to be consistent
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);