-- Update RLS policies for job_line_items to work with new rep-based filtering
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view line items for their jobs" ON public.job_line_items;
DROP POLICY IF EXISTS "Users can create line items for their jobs" ON public.job_line_items;
DROP POLICY IF EXISTS "Users can update line items for their jobs" ON public.job_line_items;
DROP POLICY IF EXISTS "Users can delete line items for their jobs" ON public.job_line_items;

-- Create new policies that check rep field in jobs_sold table
CREATE POLICY "Users can view line items for their rep jobs" 
ON public.job_line_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs_sold
    WHERE jobs_sold.id = job_line_items.job_id
    AND jobs_sold.rep IN (
      SELECT full_name 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create line items for their rep jobs" 
ON public.job_line_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs_sold
    WHERE jobs_sold.id = job_line_items.job_id
    AND jobs_sold.rep IN (
      SELECT full_name 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update line items for their rep jobs" 
ON public.job_line_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs_sold
    WHERE jobs_sold.id = job_line_items.job_id
    AND jobs_sold.rep IN (
      SELECT full_name 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete line items for their rep jobs" 
ON public.job_line_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs_sold
    WHERE jobs_sold.id = job_line_items.job_id
    AND jobs_sold.rep IN (
      SELECT full_name 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);