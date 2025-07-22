-- Make user_id optional and provide a default value for jobs_sold table
ALTER TABLE public.jobs_sold 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';