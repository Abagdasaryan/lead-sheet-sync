-- Remove default value from webhook_sent_at column so jobs aren't locked by default
ALTER TABLE public.jobs_sold 
ALTER COLUMN webhook_sent_at DROP DEFAULT;

-- Update existing jobs that were incorrectly marked as webhook sent 
-- (where webhook_sent_at equals created_at, meaning it was auto-set)
UPDATE public.jobs_sold 
SET webhook_sent_at = NULL 
WHERE webhook_sent_at = created_at;