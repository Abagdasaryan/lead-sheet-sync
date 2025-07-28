-- Activate the webhook configurations that are currently inactive
UPDATE public.webhook_configs 
SET is_active = true, updated_at = now()
WHERE name IN ('job_webhook', 'sheet_update_webhook') AND is_active = false;