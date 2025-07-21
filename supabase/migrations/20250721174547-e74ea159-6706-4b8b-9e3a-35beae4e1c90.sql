-- Reset webhook status for all jobs so they can be edited again
UPDATE jobs_sold 
SET webhook_sent_at = NULL;