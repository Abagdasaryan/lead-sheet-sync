-- Create tables for jobs sold data
CREATE TABLE public.jobs_sold (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client TEXT NOT NULL,
  job_number TEXT NOT NULL,
  rep TEXT NOT NULL,
  lead_sold_for DECIMAL NOT NULL,
  payment_type TEXT NOT NULL,
  install_date DATE NOT NULL,
  sf_order_id TEXT NOT NULL,
  webhook_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for job line items
CREATE TABLE public.job_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs_sold(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jobs_sold ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs_sold
CREATE POLICY "Users can view their own jobs" 
ON public.jobs_sold 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.jobs_sold 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs_sold 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for job_line_items
CREATE POLICY "Users can view line items for their jobs" 
ON public.job_line_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.jobs_sold 
  WHERE id = job_line_items.job_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create line items for their jobs" 
ON public.job_line_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs_sold 
  WHERE id = job_line_items.job_id 
  AND user_id = auth.uid()
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_jobs_sold_updated_at
BEFORE UPDATE ON public.jobs_sold
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();