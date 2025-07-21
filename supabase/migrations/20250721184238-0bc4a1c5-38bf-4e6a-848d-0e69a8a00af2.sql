-- Add missing DELETE policy for job_line_items
CREATE POLICY "Users can delete line items for their jobs" 
ON job_line_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM jobs_sold 
  WHERE jobs_sold.id = job_line_items.job_id 
  AND jobs_sold.user_id = auth.uid()
));

-- Add UPDATE policy for job_line_items in case needed
CREATE POLICY "Users can update line items for their jobs" 
ON job_line_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM jobs_sold 
  WHERE jobs_sold.id = job_line_items.job_id 
  AND jobs_sold.user_id = auth.uid()
));