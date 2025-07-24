-- Update RLS policies for jobs_sold to filter by rep field matching user's full_name
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs_sold;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.jobs_sold;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs_sold;

-- Create new policies that match rep field with user's full_name
CREATE POLICY "Users can view jobs for their rep name" 
ON public.jobs_sold 
FOR SELECT 
USING (
  rep IN (
    SELECT full_name 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create jobs for their rep name" 
ON public.jobs_sold 
FOR INSERT 
WITH CHECK (
  rep IN (
    SELECT full_name 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update jobs for their rep name" 
ON public.jobs_sold 
FOR UPDATE 
USING (
  rep IN (
    SELECT full_name 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);