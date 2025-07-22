-- Make all fields optional except sf_order_id and job_number in jobs_sold table
ALTER TABLE public.jobs_sold 
ALTER COLUMN client DROP NOT NULL,
ALTER COLUMN rep DROP NOT NULL,
ALTER COLUMN lead_sold_for DROP NOT NULL,
ALTER COLUMN payment_type DROP NOT NULL,
ALTER COLUMN install_date DROP NOT NULL;