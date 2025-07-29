-- Remove duplicate line items for job 572eaf3b-33a6-437d-b926-72277bf4d80a
-- Keep the first set (created at 01:01:22) and remove the duplicates (created at 01:01:24)
DELETE FROM job_line_items 
WHERE job_id = '572eaf3b-33a6-437d-b926-72277bf4d80a' 
AND created_at = '2025-07-29 01:01:24.175811+00';