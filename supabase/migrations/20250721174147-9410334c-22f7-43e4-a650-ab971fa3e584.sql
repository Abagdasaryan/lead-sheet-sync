-- Clear line items for testing
DELETE FROM job_line_items 
WHERE job_id IN (
  SELECT id FROM jobs_sold 
  WHERE user_id = auth.uid()
);